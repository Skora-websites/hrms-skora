import { NextRequest, NextResponse } from "next/server";
import {
  getLeaveRequests,
  getLeaveRequestById,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveDashboard,
  getLeavePlans,
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeaveBalances,
} from "@/services/hrm/leave";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { leaveApplySchema, leaveDecisionSchema, parseBody } from "@/lib/validations";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";

const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

/** Create an in-app notification for the affected user (best-effort). */
async function notifyUser(userId: string, title: string, body: string) {
  try {
    const db = await getDb();
    if (db && ObjectId.isValid(userId)) {
      await db.collection("notifications").insertOne({
        userId,
        title,
        body,
        type: "leave",
        isRead: false,
        createdAt: new Date(),
        tenantId: "default",
      });
    }
  } catch {
    // Notification failure must not fail the leave mutation itself.
  }
}

/** Resolve the manager-of relationship for scoping approvals. */
async function isDirectReport(managerId: string, employeeId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const employee = await db.collection("users").findOne({ _id: new ObjectId(employeeId) });
    return employee?.reportingManager === managerId;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const planId = searchParams.get("planId");
    const dashboard = searchParams.get("dashboard");

    if (dashboard === "true") {
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      }
      const dashData = await getLeaveDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "balances" && userId) {
      if (auth.role === "employee" && userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const balances = await getLeaveBalances(tenantId, userId);
      return NextResponse.json({ data: balances });
    }

    if (type === "plans") {
      const plans = await getLeavePlans(tenantId);
      return NextResponse.json({ data: plans });
    }

    if (type === "types") {
      const types = await getLeaveTypes(tenantId, planId || undefined);
      return NextResponse.json({ data: types });
    }

    if (id) {
      const requestData = await getLeaveRequestById(id);
      if (!requestData) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      // Employees may only view their own leave requests (IDOR guard).
      if (auth.role === "employee" && (requestData as any).userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Managers may only view their direct reports' requests.
      if (auth.role === "manager" && (requestData as any).userId !== auth.userId) {
        const isManagerOf = await isDirectReport(auth.userId, (requestData as any).userId);
        if (!isManagerOf) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      return NextResponse.json({ data: requestData });
    }

    const requests = await getLeaveRequests(tenantId, {
      userId: userId || undefined,
      status: status as any || undefined,
    });

    // Employees can only view their own leave requests
    if (auth.role === "employee") {
      const filtered = requests.filter((r) => r.userId === auth.userId);
      return NextResponse.json({ data: filtered });
    }

    // Managers can only view their direct reports' requests (plus their own)
    if (auth.role === "manager") {
      const filtered = await filterForManager(requests, auth.userId);
      return NextResponse.json({ data: filtered });
    }

    return NextResponse.json({ data: requests });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/leaves error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/** Keep only the manager's own requests and those of direct reports. */
async function filterForManager(requests: any[], managerId: string): Promise<any[]> {
  const result: any[] = [];
  for (const r of requests) {
    if (r.userId === managerId) {
      result.push(r);
      continue;
    }
    if (await isDirectReport(managerId, r.userId)) {
      result.push(r);
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    if (action === "apply") {
      const parsed = await parseBody(request, leaveApplySchema);
      if (!parsed.success) return parsed.response!;
      const data = parsed.data!;

      // Ownership: non-HR roles can only apply for themselves.
      let userId = data.userId || auth.userId;
      if (data.userId === "current") userId = auth.userId;
      if (!HR_LEVEL_ROLES.has(auth.role) && userId !== auth.userId) {
        return NextResponse.json(
          { error: "You can only apply for leave for yourself" },
          { status: 403 }
        );
      }

      const result = await applyLeave(tenantId, {
        userId,
        leaveTypeId: data.leaveTypeId,
        fromDate: new Date(data.fromDate),
        toDate: new Date(data.toDate),
        reason: data.reason,
        attachmentURL: data.attachmentURL,
      });

      // Notify approvers (HR admins) so the request surfaces in their queue.
      try {
        const db = await getDb();
        if (db) {
          const applicant = await db.collection("users").findOne({ _id: new ObjectId(userId) });
          const applicantName =
            (applicant as any)?.displayName || (applicant as any)?.email || userId;
          const admins = await db
            .collection("users")
            .find({ role: { $in: ["hr_admin", "admin", "super_admin"] }, tenantId: "default" })
            .toArray();
          for (const admin of admins) {
            await db.collection("notifications").insertOne({
              userId: (admin as any)._id.toString(),
              title: "New Leave Request",
              body: `${applicantName} requested ${result.totalDays} day(s) of leave: ${data.reason}`,
              type: "leave",
              isRead: false,
              referenceType: "leave",
              referenceId: (result as any).id,
              createdAt: new Date(),
              tenantId: "default",
            });
          }
        }
      } catch {
        // Best-effort.
      }

      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (action === "approve" || action === "reject") {
      // Only non-employee roles may decide leave requests.
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
      }

      const parsed = await parseBody(request, leaveDecisionSchema);
      if (!parsed.success) return parsed.response!;
      const decision = parsed.data!;

      const existing: any = await getLeaveRequestById(decision.id);
      if (!existing) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }

      // Integrity guard: only pending requests can be decided. Re-deciding an
      // approved/rejected request would double-corrupt leave balances.
      if (existing.status !== "pending") {
        return NextResponse.json(
          { error: `This request was already ${existing.status}` },
          { status: 409 }
        );
      }

      // Self-approval is never allowed.
      if (existing.userId === auth.userId) {
        return NextResponse.json(
          { error: "You cannot approve or reject your own leave request" },
          { status: 403 }
        );
      }

      // Managers may only decide requests from their direct reports.
      if (auth.role === "manager") {
        const isManagerOf = await isDirectReport(auth.userId, existing.userId);
        if (!isManagerOf) {
          return NextResponse.json(
            { error: "You can only approve leave for your direct reports" },
            { status: 403 }
          );
        }
      }

      // The approver is ALWAYS the authenticated caller — the client-supplied
      // approvedById is ignored to prevent spoofed attribution.
      const approverId = auth.userId;

      if (decision.action === "approve") {
        const result = await approveLeave(decision.id, approverId);
        if (!result) {
          return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        await notifyUser(
          existing.userId,
          "Leave Approved",
          `Your leave request (${existing.totalDays} day(s)) has been approved.`
        );
        return NextResponse.json({ data: result });
      } else {
        const result = await rejectLeave(decision.id, approverId, decision.reason || "Rejected");
        if (!result) {
          return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
        }
        await notifyUser(
          existing.userId,
          "Leave Rejected",
          `Your leave request (${existing.totalDays} day(s)) was rejected.${decision.reason ? ` Reason: ${decision.reason}` : ""}`
        );
        return NextResponse.json({ data: result });
      }
    }

    if (action === "cancel") {
      const existing: any = await getLeaveRequestById(body.id);
      if (!existing) {
        return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
      }
      // Ownership: only the requester or HR-level roles can cancel (IDOR guard).
      if (existing.userId !== auth.userId && !HR_LEVEL_ROLES.has(auth.role)) {
        return NextResponse.json(
          { error: "You can only cancel your own leave requests" },
          { status: 403 }
        );
      }
      const result = await cancelLeave(body.id);
      if (!result) {
        return NextResponse.json({ error: "Leave request not found or cannot be cancelled" }, { status: 400 });
      }
      return NextResponse.json({ data: result });
    }

    // ── Leave Type CRUD — HR-level only (was previously open to any
    //    authenticated user, allowing policy tampering) ─────────────
    if (action === "create_type" || action === "update_type") {
      if (!HR_LEVEL_ROLES.has(auth.role)) {
        return NextResponse.json({ error: "Forbidden: HR access required" }, { status: 403 });
      }

      if (action === "create_type") {
        if (!body.name || !body.code) {
          return NextResponse.json(
            { error: "Missing required fields: name, code" },
            { status: 400 }
          );
        }
        const { id: _id, tenantId: _t, createdAt: _c, updatedAt: _u, deletedAt: _d, action: _a, ...data } = body;
        const result = await createLeaveType(tenantId, data as any);
        return NextResponse.json({ data: result }, { status: 201 });
      }

      if (!body.id) {
        return NextResponse.json({ error: "id is required" }, { status: 400 });
      }
      const { id, action: _a, ...data } = body;
      const result = await updateLeaveType(id, data as any);
      if (!result) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
      }
      return NextResponse.json({ data: result });
    }

    if (action === "delete_type") {
      // Destructive policy change — super admin only.
      if (auth.role !== "super_admin") {
        return NextResponse.json(
          { error: "Forbidden: only Super Admin can delete leave types" },
          { status: 403 }
        );
      }
      const success = await deleteLeaveType(body.id);
      if (!success) {
        return NextResponse.json({ error: "Leave type not found" }, { status: 404 });
      }
      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: "Invalid action. Use: apply, approve, reject, cancel, create_type, update_type, delete_type" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/leaves error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
