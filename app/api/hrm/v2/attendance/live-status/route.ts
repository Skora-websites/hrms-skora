import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    if (auth.role === "employee") return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const userQuery: any = {
      tenantId: auth.tenantId,
      role: { $in: ["employee", "manager", "hr_admin", "admin"] },
      status: { $nin: ["inactive", "disabled"] },
    };

    if (auth.role === "manager") {
      const managerUser = await db.collection("users").findOne({ _id: new ObjectId(auth.userId), tenantId: auth.tenantId });
      const department = managerUser?.department || managerUser?.departmentName;
      if (!department) return NextResponse.json({ data: [], summary: { totalEmployees: 0, punchedIn: 0, onBreak: 0, inMeeting: 0, active: 0, punchedOut: 0, absent: 0, inOffice: 0, remote: 0 } });
      userQuery.$or = [{ department }, { departmentName: department }];
    }

    const [allUsers, records] = await Promise.all([
      db.collection("users").find(userQuery).project({ _id: 1, email: 1, displayName: 1, employeeCode: 1, department: 1, departmentName: 1, designation: 1, role: 1 }).toArray(),
      db.collection("attendance").find({ tenantId: auth.tenantId, date: todayStr }).toArray(),
    ]);

    const recordsByUser = new Map<string, any>();
    for (const record of records as any[]) recordsByUser.set(String(record.userId), record);
    const nowMs = now.getTime();

    const enriched = (allUsers as any[]).map((user: any) => {
      const userId = user._id.toString();
      const record = recordsByUser.get(userId);
      if (!record) return {
        userId, name: user.displayName || user.email, email: user.email,
        employeeCode: user.employeeCode || "—", department: user.department || user.departmentName || "—",
        designation: user.designation || "—", role: user.role, status: "absent", auxState: null,
        punchInTime: null, punchOutTime: null, effectiveWorkMinutes: 0, totalBreakMinutes: 0,
        workHours: 0, totalElapsedMinutes: 0, currentLocation: null, auxSince: null, workLocation: null,
      };

      let effectiveWorkMinutes = record.effectiveWorkMinutes || 0;
      let totalBreakMinutes = record.totalBreakMinutes || 0;
      let totalElapsedMinutes = 0;
      if (record.punchInTime && !record.punchOutTime) {
        const history = record.auxHistory || [];
        const punchInMs = new Date(record.punchInTime).getTime();
        totalElapsedMinutes = Math.max(0, Math.round((nowMs - punchInMs) / 60000));
        let effectiveMs = 0;
        let breakMs = 0;
        for (const entry of history) {
          const startMs = new Date(entry.startTime).getTime();
          const endMs = entry.endTime ? new Date(entry.endTime).getTime() : nowMs;
          const duration = Math.max(0, endMs - startMs);
          if (entry.state === "active" || entry.state === "meeting") effectiveMs += duration;
          else if (entry.state === "on_break") breakMs += duration;
        }
        effectiveWorkMinutes = Math.round(effectiveMs / 60000);
        totalBreakMinutes = Math.round(breakMs / 60000);
      } else if (record.punchOutTime) {
        totalElapsedMinutes = Math.max(0, Math.round((new Date(record.punchOutTime).getTime() - new Date(record.punchInTime).getTime()) / 60000));
      }

      const auxHistory = record.auxHistory || [];
      const currentPeriod = auxHistory.length ? auxHistory[auxHistory.length - 1] : null;
      return {
        userId, name: record.userName || user.displayName || user.email, email: record.userEmail || user.email,
        employeeCode: record.employeeCode || user.employeeCode || "—", department: user.department || user.departmentName || "—",
        designation: user.designation || "—", role: user.role,
        status: record.punchOutTime ? "punched_out" : record.punchInTime ? "punched_in" : "absent",
        auxState: record.auxState || "active", punchInTime: record.punchInTime || null, punchOutTime: record.punchOutTime || null,
        effectiveWorkMinutes, totalBreakMinutes,
        workHours: record.workHours || Number((effectiveWorkMinutes / 60).toFixed(2)), totalElapsedMinutes,
        currentLocation: record.currentLocation || null,
        auxSince: currentPeriod && !currentPeriod.endTime ? currentPeriod.startTime : null,
        location: record.location || null,
        workLocation: record.workLocation || (record.location && record.location.includes("[remote]") ? "remote" : "office"),
        status_label: record.status || "—",
      };
    });

    enriched.sort((a: any, b: any) => {
      const order: Record<string, number> = { punched_in: 0, punched_out: 1, absent: 2 };
      const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    const summary = {
      totalEmployees: enriched.length,
      punchedIn: enriched.filter((e: any) => e.status === "punched_in").length,
      onBreak: enriched.filter((e: any) => e.status === "punched_in" && e.auxState === "on_break").length,
      inMeeting: enriched.filter((e: any) => e.status === "punched_in" && e.auxState === "meeting").length,
      active: enriched.filter((e: any) => e.status === "punched_in" && e.auxState === "active").length,
      punchedOut: enriched.filter((e: any) => e.status === "punched_out").length,
      absent: enriched.filter((e: any) => e.status === "absent").length,
      inOffice: enriched.filter((e: any) => e.status === "punched_in" && e.workLocation === "office").length,
      remote: enriched.filter((e: any) => e.status === "punched_in" && e.workLocation === "remote").length,
    };

    return NextResponse.json({ data: enriched, summary });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/attendance/live-status error:", error);
    return NextResponse.json({ error: "Unable to load live attendance status" }, { status: 500 });
  }
}
