"use server";

import { recordPunchIn, recordPunchOut, recordAUXChange, getAttendanceRecords, userDateQuery, type AUXState, type AttendanceRecord } from "@/lib/db/attendance";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth } from "@/lib/api-auth";
import { hrmUsersService } from "@/lib/hrm/firestore";
import { ObjectId } from "@/lib/db/mysql";

export async function punchInAction(data: {
  userId: string;
  userName: string;
  userEmail: string;
  employeeCode?: string;
  status?: string;
  tenantId?: string;
  managerId?: string;
  location?: string;
  workLocation?: string;
  currentLocation?: Record<string, unknown>;
}) {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return { success: false, error: "Unauthorized" };
    if (data.userId !== auth.userId) return { success: false, error: "You can only mark your own attendance" };

    const user = await hrmUsersService.findById(auth.userId);
    if (!user || (user as any).tenantId !== auth.tenantId) return { success: false, error: "User not found" };

    const record = await recordPunchIn({
      userId: auth.userId,
      userName: (user as any).displayName || (user as any).firstName || "Employee",
      userEmail: (user as any).email || "",
      employeeCode: (user as any).employeeCode,
      status: data.status,
      tenantId: auth.tenantId,
      managerId: (user as any).managerId,
      location: data.location,
      workLocation: data.workLocation,
      currentLocation: data.currentLocation,
    });
    if (!record) return { success: false, error: "Failed to save attendance record. Please try again." };

    try {
      const db = await getDb();
      if (db) {
        await db.collection("notifications").insertOne({
          userId: (user as any).managerId || "admin",
          title: `Attendance Marked: ${(user as any).displayName || (user as any).firstName || "Employee"}`,
          body: `Attendance was marked at ${new Date(record.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Status: ${record.status}.`,
          type: "attendance", isRead: false, createdAt: new Date(), tenantId: auth.tenantId,
        });
      }
    } catch (err) {
      console.warn("Notification dispatch notice:", err);
    }
    revalidatePath("/hrms/attendance");
    revalidatePath("/hrms/employee");
    revalidatePath("/hrms/manager");
    revalidatePath("/hrms/manager/my-team");
    return { success: true, record };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function punchOutAction(userId: string, dateStr: string) {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return { success: false, error: "Unauthorized" };
    if (userId !== auth.userId) return { success: false, error: "You can only punch out your own attendance" };
    const success = await recordPunchOut(auth.userId, dateStr, auth.tenantId);
    if (success) {
      revalidatePath("/hrms/attendance");
      revalidatePath("/hrms/employee");
      revalidatePath("/hrms/manager");
      revalidatePath("/hrms/manager/my-team");
    }
    return { success, error: success ? undefined : "Attendance could not be punched out. It may already be closed or missing." };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Early punch-out (before office end): log the departure reason on today's
 * attendance record AND notify the reporting manager (if any) plus HR and
 * the CEO so the early exit is always visible to management. The user is
 * allowed to punch out immediately after submitting — the request is a
 * logged escalation, not a gate.
 */
export async function submitEarlyDepartureAction(userId: string, dateStr: string, reason: string) {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return { success: false, error: "Unauthorized" };
    if (userId !== auth.userId) return { success: false, error: "You can only submit your own early departure" };
    const trimmed = String(reason || "").trim();
    if (!trimmed) return { success: false, error: "A reason is required for an early departure." };

    const db = await getDb();
    if (!db) return { success: false, error: "Database not available" };

    const user = await db.collection("users").findOne({ _id: new ObjectId(auth.userId) });
    if (!user) return { success: false, error: "User not found" };
    const displayName = (user as any).displayName || (user as any).firstName || (user as any).email;

    // ── Resolve recipients ──
    // 1. Reporting manager: reportingManager holds an ObjectId OR a display
    //    name / managerEmail (system convention) — accept any.
    const recipientIds = new Set<string>();
    const recipientLabels: string[] = [];
    const rmId = String((user as any).reportingManager || "");
    const rmEmail = String((user as any).managerEmail || "");
    let managerUser: any = null;
    if (/^[0-9a-fA-F]{24}$/.test(rmId)) {
      managerUser = await db.collection("users").findOne({ _id: new ObjectId(rmId) });
    }
    if (!managerUser && rmId) {
      managerUser = await db.collection("users").findOne({ displayName: rmId });
    }
    if (!managerUser && rmEmail) {
      managerUser = await db.collection("users").findOne({ email: rmEmail.toLowerCase().trim() });
    }
    if (managerUser && String(managerUser._id) !== auth.userId) {
      recipientIds.add(String(managerUser._id));
      recipientLabels.push(`Reporting manager: ${(managerUser as any).displayName || (managerUser as any).email}`);
    }
    // 2. HR admins + CEO — always notified so the log is guaranteed to reach
    //    management even when no reporting manager is assigned.
    const hrAndCeo = await db.collection("users").find({
      role: { $in: ["super_admin", "hr_admin", "admin"] },
      status: { $nin: ["inactive", "disabled"] },
    }).project({ _id: 1, displayName: 1 }).toArray();
    for (const u of hrAndCeo) {
      if (String(u._id) !== auth.userId) recipientIds.add(String(u._id));
    }
    recipientLabels.push("HR & CEO");

    const hourLabel = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
    const title = `Early Departure — ${displayName}`;
    const body = `${displayName} punched out early at ${hourLabel} (before office end). Reason: ${trimmed}.`;

    for (const recipientId of recipientIds) {
      await db.collection("notifications").insertOne({
        userId: recipientId,
        title,
        body,
        type: "approval", isRead: false, createdAt: new Date(), tenantId: auth.tenantId,
        referenceType: "early_departure", referenceId: auth.userId,
      });
    }

    // Stamp the attendance record so the early exit is visible on the
    // day's logs (reports, roster drill-down) and in regularization reviews.
    await db.collection("attendance").updateOne(
      userDateQuery(auth.userId, dateStr, auth.tenantId),
      { $set: { earlyDeparture: { reason: trimmed, requestedAt: new Date(), notifiedTo: recipientLabels, status: "submitted" } } }
    ).catch(() => undefined);

    return { success: true, notifiedCount: recipientIds.size };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function updateAUXStateAction(userId: string, dateStr: string, newState: AUXState) {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return { success: false, error: "Unauthorized" };
    if (userId !== auth.userId) return { success: false, error: "You can only change your own AUX state" };
    const record = await recordAUXChange(auth.userId, dateStr, newState, auth.tenantId);
    if (!record) return { success: false, error: "No attendance record found for today. Please punch in first." };
    revalidatePath("/hrms/attendance");
    revalidatePath("/hrms/employee");
    return { success: true, record };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function fetchAttendanceRecordsAction(filter?: {
  userId?: string;
  date?: string;
  department?: string;
}) {
  try {
    const auth = await requireAuth();
    if (auth instanceof Response) return { success: false, records: [], error: "Unauthorized" };
    const requestedUserId = filter?.userId;
    if (auth.role === "employee" && requestedUserId && requestedUserId !== auth.userId) {
      return { success: false, records: [], error: "Forbidden" };
    }

    const db = await getDb();
    if (!db) {
      return { success: false, records: [], error: "Database not available" };
    }

    // 1. Fetch user department lookup map for enrichment
    const allUsers = await db.collection("users").find({
      status: { $nin: ["inactive", "disabled"] },
    }).toArray();

    const userDeptMap = new Map<string, string>();
    for (const u of allUsers) {
      const dept = String(u.departmentName || u.department || "").trim();
      if (dept) {
        if (u.id) userDeptMap.set(String(u.id), dept);
        if (u._id) userDeptMap.set(String(u._id), dept);
        if (u.legacyId) userDeptMap.set(String(u.legacyId), dept);
        if (u.email) userDeptMap.set(String(u.email).toLowerCase(), dept);
      }
    }

    // 2. Role-based scoping:
    let allowedUserIds: Set<string> | null = null;
    let allowedEmails: Set<string> | null = null;
    let managerDept: string | null = null;

    if (auth.role === "employee") {
      allowedUserIds = new Set([String(auth.userId)]);
    } else if (auth.role === "manager") {
      // Find manager in users collection
      const managerUser = allUsers.find(
        (u) =>
          String(u.id) === String(auth.userId) ||
          String(u._id) === String(auth.userId) ||
          String(u.legacyId) === String(auth.userId)
      );

      managerDept = managerUser?.departmentName || managerUser?.department || null;
      const managerName = managerUser?.displayName || managerUser?.name || null;
      const managerEmail = managerUser?.email ? String(managerUser.email).toLowerCase() : null;
      const managerId = managerUser?.id ? String(managerUser.id) : String(auth.userId);
      const managerLegacyId = managerUser?.legacyId ? String(managerUser.legacyId) : null;

      // Filter team users
      const teamUsers = allUsers.filter((u) => {
        // Always include manager themselves
        if (
          String(u.id) === managerId ||
          String(u._id) === String(auth.userId) ||
          (managerLegacyId && String(u.legacyId) === managerLegacyId)
        ) {
          return true;
        }

        // Match department
        const uDept = String(u.departmentName || u.department || "").toLowerCase();
        if (managerDept && uDept === managerDept.toLowerCase()) {
          return true;
        }

        // Match reporting manager
        const rep = String(u.reportingManager || "").toLowerCase();
        if (managerName && rep === managerName.toLowerCase()) return true;
        if (managerEmail && rep === managerEmail) return true;
        if (u.managerEmail && managerEmail && String(u.managerEmail).toLowerCase() === managerEmail) return true;
        if (
          u.managerId &&
          (String(u.managerId) === managerId || (managerLegacyId && String(u.managerId) === managerLegacyId))
        ) {
          return true;
        }

        return false;
      });

      allowedUserIds = new Set();
      allowedEmails = new Set();
      for (const u of teamUsers) {
        if (u.id) allowedUserIds.add(String(u.id));
        if (u._id) allowedUserIds.add(String(u._id));
        if (u.legacyId) allowedUserIds.add(String(u.legacyId));
        if (u.email) allowedEmails.add(String(u.email).toLowerCase());
      }

      if (requestedUserId && !allowedUserIds.has(String(requestedUserId))) {
        return { success: false, records: [], error: "Forbidden" };
      }
    }

    const rawRecords = await getAttendanceRecords({
      userId: auth.role === "employee" ? auth.userId : requestedUserId,
      date: filter?.date,
      tenantId: auth.tenantId,
    });

    // 3. Enrich each record with department
    let records: AttendanceRecord[] = rawRecords.map((r) => {
      const dept =
        r.department ||
        userDeptMap.get(String(r.userId)) ||
        (r.userEmail ? userDeptMap.get(r.userEmail.toLowerCase()) : undefined) ||
        "";
      return {
        ...r,
        department: dept,
      };
    });

    // 4. Filter by manager team if manager
    if (auth.role === "manager") {
      const targetDept = (managerDept || "Development").toLowerCase().trim();
      records = records.filter((r) => {
        const rDept = String(r.department || "").toLowerCase().trim();
        // If the record has a department that differs from manager's department, exclude it!
        if (rDept && rDept !== targetDept) {
          return false;
        }
        // If department matches manager's department, include it
        if (rDept === targetDept) {
          return true;
        }
        // Fallback: verify against team allowedUserIds and allowedEmails
        if (allowedUserIds && allowedUserIds.has(String(r.userId))) return true;
        if (allowedEmails && r.userEmail && allowedEmails.has(r.userEmail.toLowerCase())) return true;
        return false;
      });
    }

    // 5. Filter by department if passed (e.g. from HR Admin / Super Admin filter)
    if (filter?.department && filter.department !== "All Departments") {
      const targetDept = filter.department.toLowerCase().trim();
      records = records.filter((r) => r.department && r.department.toLowerCase().trim() === targetDept);
    }

    return { success: true, records, managerDepartment: managerDept };
  } catch (error) {
    return { success: false, records: [], error: (error as Error).message };
  }
}
