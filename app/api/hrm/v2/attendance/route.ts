import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords, getAttendanceById, markAttendance, updateAttendance, deleteAttendance, getAttendanceDashboard, getAttendanceStats, calculateAttendanceStats } from "@/services/hrm/attendance";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";

async function getManagerDepartmentUserIds(userId: string, tenantId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const manager = await db.collection("users").findOne({ _id: new ObjectId(userId), tenantId });
  const department = manager?.department || manager?.departmentName;
  if (!department) return [];
  const users = await db.collection("users").find({ tenantId, $or: [{ department }, { departmentName: department }], status: { $nin: ["inactive", "disabled"] } }).project({ _id: 1 }).toArray();
  return users.map(u => u._id.toString());
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const tenantId = auth.tenantId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const requestedUserId = searchParams.get("userId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const dashboard = searchParams.get("dashboard");
    const stats = searchParams.get("stats");
    const date = searchParams.get("date");

    const managerUserIds = auth.role === "manager" ? await getManagerDepartmentUserIds(auth.userId, tenantId) : null;
    if (auth.role === "manager" && requestedUserId && !managerUserIds!.includes(requestedUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (id) {
      const record = await getAttendanceById(id);
      if (!record || record.tenantId !== tenantId) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
      if (auth.role === "employee" && record.userId !== auth.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (auth.role === "manager" && !managerUserIds!.includes(record.userId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ data: record });
    }

    if (dashboard === "true") {
      if (auth.role === "employee" || auth.role === "manager") return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      return NextResponse.json({ data: await getAttendanceDashboard(tenantId) });
    }

    if (stats === "true" && requestedUserId) {
      if (auth.role === "employee" && requestedUserId !== auth.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (auth.role === "manager" && !managerUserIds!.includes(requestedUserId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
      const y = year ? parseInt(year, 10) : new Date().getFullYear();
      return NextResponse.json({ data: await getAttendanceStats(tenantId, requestedUserId, m, y) });
    }

    const effectiveUserId = auth.role === "employee" ? auth.userId : requestedUserId || undefined;
    let records = await getAttendanceRecords(tenantId, { userId: effectiveUserId, date: date || undefined, status: status || undefined });
    if (auth.role === "manager") records = records.filter((rec: any) => managerUserIds!.includes(String(rec.userId)));

    const enriched = records.map((rec: any) => ({
      _id: rec._id || rec.id, userId: rec.userId, userName: rec.userName || rec.userDisplayName || "", userEmail: rec.userEmail || "",
      employeeCode: rec.employeeCode, date: rec.date || (rec.punchInTime ? new Date(rec.punchInTime).toISOString().split("T")[0] : ""),
      punchInTime: rec.punchInTime || rec.checkIn, punchOutTime: rec.punchOutTime || rec.checkOut, location: rec.location,
      distanceMeters: rec.currentLocation?.distanceFromOffice, status: rec.status, workHours: rec.workHours || rec.totalHours,
      overtimeHours: rec.overtimeHours, regularizationStatus: rec.regularizationStatus, managerId: rec.managerId,
      // AUX + work-location state the punch card needs to restore its live UI.
      auxState: rec.auxState || "active",
      auxHistory: Array.isArray(rec.auxHistory) ? rec.auxHistory : [],
      totalBreakMinutes: rec.totalBreakMinutes || 0,
      effectiveWorkMinutes: rec.effectiveWorkMinutes || 0,
      workLocation: rec.workLocation || (typeof rec.location === "string" && rec.location.includes("[remote]") ? "remote" : "office"),
    }));
    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/attendance error:", error);
    return NextResponse.json({ error: "Unable to load attendance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;
    const body = await request.json();
    if (!body.userId || !body.date) return NextResponse.json({ error: "userId and date are required" }, { status: 400 });
    const tenantId = auth.tenantId;
    let workdayType = body.workdayType || "regular";
    try {
      const db = await getDb();
      if (db) {
        const settingsDoc = await db.collection("settings").findOne({ key: "super_admin_system" });
        const workDays = settingsDoc?.settings?.officeRules?.workDays;
        if (workDays && !workDays.includes(new Date(body.date).getDay())) workdayType = "weekly_off";
      }
    } catch {}
    const record = await markAttendance(tenantId, {
      userId: body.userId, date: new Date(body.date), checkIn: body.checkIn ? new Date(body.checkIn) : undefined,
      checkOut: body.checkOut ? new Date(body.checkOut) : undefined, shiftId: body.shiftId, workdayType,
      source: body.source || "manual",
    });
    if (body.calculateStats && record) {
      const d = new Date(body.date);
      await calculateAttendanceStats(tenantId, body.userId, d.getMonth() + 1, d.getFullYear());
    }
    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/attendance error:", error);
    return NextResponse.json({ error: "Unable to save attendance" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    const existing = await getAttendanceById(id);
    if (!existing || existing.tenantId !== auth.tenantId) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    const body = await request.json();
    delete body.tenantId;
    delete body.userId;
    const record = await updateAttendance(id, body);
    if (!record) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    return NextResponse.json({ data: record });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/attendance error:", error);
    return NextResponse.json({ error: "Unable to update attendance" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    const existing = await getAttendanceById(id);
    if (!existing || existing.tenantId !== auth.tenantId) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    if (!(await deleteAttendance(id))) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/attendance error:", error);
    return NextResponse.json({ error: "Unable to delete attendance" }, { status: 500 });
  }
}
