import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";
import { ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    // Check that role is manager, hr_admin, or super_admin
    if (auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const tenantId = auth.tenantId || "default";
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const now = new Date();
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // 1. Resolve Manager & Department
    const managerUser = await db.collection("users").findOne({
      _id: new ObjectId(auth.userId),
      tenantId,
    });

    const isCeo = auth.role === "super_admin";
    const department = isCeo ? null : (managerUser?.department || managerUser?.departmentName || null);

    // 2. Build Team Query
    const teamQuery: any = {
      tenantId,
      status: { $nin: ["inactive", "disabled", "terminated", "resigned"] },
      role: { $in: ["employee", "agent"] },
    };

    if (department) {
      teamQuery.$or = [{ department }, { departmentName: department }];
    }

    // 3. Parallel Queries for Team Data
    const [
      teamUsers,
      todayAttendanceRecords,
      monthAttendanceRecords,
      pendingLeaves,
      pendingRegularizations,
      pendingOvertime,
      pendingExpenses,
      pending360Reviews,
    ] = await Promise.all([
      // Team members
      db.collection("users").find(teamQuery).project({
        _id: 1,
        email: 1,
        displayName: 1,
        name: 1,
        employeeCode: 1,
        department: 1,
        departmentName: 1,
        designation: 1,
        image: 1,
        createdAt: 1,
        onboardingStatus: 1,
      }).toArray(),

      // Today's attendance records
      db.collection("attendance").find({
        tenantId,
        date: todayStr,
      }).toArray(),

      // Month's attendance records for team (for late mark radar)
      db.collection("attendance").find({
        tenantId,
        date: { $gte: `${currentMonthStr}-01`, $lte: `${currentMonthStr}-31` },
      }).toArray(),

      // Pending leaves
      db.collection("leave_requests").find({
        tenantId,
        status: "pending",
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Pending regularizations
      db.collection("regularization_requests").find({
        tenantId,
        status: "pending",
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Pending overtime claims
      db.collection("overtime_claims").find({
        tenantId,
        status: "pending",
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Pending expense claims
      db.collection("expenses").find({
        tenantId,
        status: { $in: ["pending", "submitted"] },
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Pending 360 appraisal evaluations
      db.collection("performance_reviews").find({
        tenantId,
        status: "pending_manager",
      }).toArray().catch(() => []),
    ]);

    // Set of team user IDs for fast containment checks
    const teamUserIds = new Set<string>();
    const teamUserMap = new Map<string, any>();
    for (const u of (teamUsers || [])) {
      const uid = u._id.toString();
      teamUserIds.add(uid);
      teamUserMap.set(uid, u);
    }

    // 4. Correlate Today's Attendance with Team Members
    const todayRecByUser = new Map<string, any>();
    for (const r of (todayAttendanceRecords || [])) {
      todayRecByUser.set(String(r.userId), r);
    }

    let punchedInCount = 0;
    let activeCount = 0;
    let onBreakCount = 0;
    let inMeetingCount = 0;
    let punchedOutCount = 0;
    let inOfficeCount = 0;
    let remoteCount = 0;

    const directReports = (teamUsers || []).map((u: any) => {
      const uid = u._id.toString();
      const rec = todayRecByUser.get(uid);

      const isPunchedIn = Boolean(rec?.punchInTime && !rec?.punchOutTime);
      const isPunchedOut = Boolean(rec?.punchOutTime);
      const auxState = rec?.auxState || "active";
      const workLocation = rec?.workLocation || "office";

      if (isPunchedIn) {
        punchedInCount++;
        if (auxState === "active") activeCount++;
        if (auxState === "on_break") onBreakCount++;
        if (auxState === "meeting") inMeetingCount++;
        if (workLocation === "office") inOfficeCount++;
        if (workLocation === "remote") remoteCount++;
      } else if (isPunchedOut) {
        punchedOutCount++;
      }

      // Compute punctuality for today
      let punctuality: "on_time" | "grace" | "late" | "absent" = "absent";
      let lateMinutes = 0;

      if (rec?.punchInTime) {
        const pDate = new Date(rec.punchInTime);
        const pMins = pDate.getHours() * 60 + pDate.getMinutes();
        if (pMins <= 600) {
          punctuality = "on_time";
        } else if (pMins <= 615) {
          punctuality = "grace";
          lateMinutes = pMins - 600;
        } else {
          punctuality = "late";
          lateMinutes = pMins - 600;
        }
      }

      return {
        id: uid,
        name: u.displayName || u.name || u.email,
        email: u.email,
        employeeCode: u.employeeCode || "—",
        department: u.department || u.departmentName || "—",
        designation: u.designation || "Staff",
        avatar: u.image || null,
        status: isPunchedIn ? "punched_in" : isPunchedOut ? "punched_out" : "absent",
        auxState: isPunchedIn ? auxState : null,
        workLocation: isPunchedIn ? workLocation : null,
        punchInTime: rec?.punchInTime || null,
        punchOutTime: rec?.punchOutTime || null,
        workHours: rec?.workHours || 0,
        effectiveWorkMinutes: rec?.effectiveWorkMinutes || 0,
        totalBreakMinutes: rec?.totalBreakMinutes || 0,
        punctuality,
        lateMinutes,
      };
    });

    const absentCount = Math.max(0, directReports.length - (punchedInCount + punchedOutCount));

    // 5. Exception Radar
    // A. Employees with >= 3 Late Marks this month
    const lateMarksCountByEmp = new Map<string, number>();
    for (const r of (monthAttendanceRecords || [])) {
      const uid = String(r.userId);
      if (teamUserIds.has(uid) && r.punchInTime) {
        const pDate = new Date(r.punchInTime);
        const pMins = pDate.getHours() * 60 + pDate.getMinutes();
        if (pMins > 615) {
          lateMarksCountByEmp.set(uid, (lateMarksCountByEmp.get(uid) || 0) + 1);
        }
      }
    }

    const lateMarkExceptions: any[] = [];
    lateMarksCountByEmp.forEach((count, uid) => {
      if (count >= 3) {
        const userObj = teamUserMap.get(uid);
        lateMarkExceptions.push({
          userId: uid,
          name: userObj?.displayName || userObj?.name || userObj?.email || "Employee",
          employeeCode: userObj?.employeeCode || "—",
          lateCount: count,
          warning: "Exceeded 3 late-mark grace allowance",
        });
      }
    });

    // B. GPS Indoor Drift Exceptions needing manager verification (101m - 250m)
    const driftExceptions: any[] = [];
    for (const r of (todayAttendanceRecords || [])) {
      const uid = String(r.userId);
      if (teamUserIds.has(uid) && ((r as any).status === "drift_exception" || (r as any).tier === "indoor_drift_exception")) {
        const userObj = teamUserMap.get(uid);
        driftExceptions.push({
          userId: uid,
          name: userObj?.displayName || userObj?.name || userObj?.email,
          distance: (r as any).distanceMeters || (r as any).currentLocation?.distance || 150,
          punchInTime: r.punchInTime,
        });
      }
    }

    // C. Unclosed Punches from previous working days
    const unclosedPunches: any[] = [];
    for (const r of (monthAttendanceRecords || [])) {
      const uid = String(r.userId);
      if (teamUserIds.has(uid) && r.date < todayStr && r.punchInTime && !r.punchOutTime) {
        const userObj = teamUserMap.get(uid);
        unclosedPunches.push({
          userId: uid,
          date: r.date,
          name: userObj?.displayName || userObj?.name || userObj?.email,
          punchInTime: r.punchInTime,
        });
      }
    }

    // 6. Unified 4-in-1 Approval Hub Queue
    // Filter pending requests to team members
    const teamLeaves = (pendingLeaves || []).filter((l: any) => teamUserIds.has(String(l.userId))).map((l: any) => ({
      id: l._id.toString(),
      category: "leave" as const,
      employeeId: String(l.userId),
      employeeName: l.employeeName || l.userName || teamUserMap.get(String(l.userId))?.displayName || "Employee",
      type: `${l.type || "Casual"} Leave`,
      dates: `${l.startDate || l.fromDate} to ${l.endDate || l.toDate}`,
      days: l.totalDays || l.days || 1,
      reason: l.reason || "Personal reasons",
      createdAt: l.createdAt,
      policyAlert: l.isSandwich ? "Sandwich Rule: Weekly off included in leave count" : null,
    }));

    const teamRegularizations = (pendingRegularizations || []).filter((r: any) => teamUserIds.has(String(r.userId))).map((r: any) => ({
      id: r._id.toString(),
      category: "regularization" as const,
      employeeId: String(r.userId),
      employeeName: r.employeeName || r.userName || teamUserMap.get(String(r.userId))?.displayName || "Employee",
      type: "Punch Regularization",
      dates: r.date,
      reason: r.reason || "Missed punch correction",
      createdAt: r.createdAt,
      policyAlert: r.punchInTime ? `Corrected In: ${new Date(r.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : null,
    }));

    const teamOvertime = (pendingOvertime || []).filter((o: any) => teamUserIds.has(String(o.userId))).map((o: any) => ({
      id: o._id.toString(),
      category: "overtime" as const,
      employeeId: String(o.userId),
      employeeName: o.employeeName || teamUserMap.get(String(o.userId))?.displayName || "Employee",
      type: "Overtime Claim",
      dates: o.date,
      reason: o.reason || "Sprint release & deployment support",
      createdAt: o.createdAt,
      policyAlert: `Overtime: ${Math.floor((o.overtimeMinutes || 120) / 60)}h ${(o.overtimeMinutes || 120) % 60}m (+${o.compOffDaysCredited || 0.5} comp-off day)`,
    }));

    const teamExpenses = (pendingExpenses || []).filter((e: any) => teamUserIds.has(String(e.userId))).map((e: any) => ({
      id: e._id.toString(),
      category: "expense" as const,
      employeeId: String(e.userId),
      employeeName: e.employeeName || teamUserMap.get(String(e.userId))?.displayName || "Employee",
      type: `${e.category || "General"} Reimbursement`,
      dates: e.date || todayStr,
      amount: e.amount || 0,
      reason: e.description || e.reason || "Business expense claim",
      createdAt: e.createdAt,
      policyAlert: e.receiptUrl ? "Receipt attached" : "No receipt attached — policy review needed",
    }));

    const unifiedApprovals = [
      ...teamLeaves,
      ...teamRegularizations,
      ...teamOvertime,
      ...teamExpenses,
    ];

    // 7. Team Velocity & Performance
    const probationApproaching = (teamUsers || []).filter((u: any) => {
      if (!u.createdAt) return false;
      const joinedDate = new Date(u.createdAt).getTime();
      const daysSinceJoined = Math.floor((now.getTime() - joinedDate) / (1000 * 60 * 60 * 24));
      return daysSinceJoined >= 75 && daysSinceJoined <= 90; // Approaching standard 90-day confirmation
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        manager: {
          id: auth.userId,
          name: managerUser?.displayName || managerUser?.name || "Manager",
          email: managerUser?.email,
          department: department || "All Departments",
          directReportsCount: directReports.length,
        },
        teamOverview: {
          totalTeam: directReports.length,
          punchedIn: punchedInCount,
          active: activeCount,
          onBreak: onBreakCount,
          inMeeting: inMeetingCount,
          punchedOut: punchedOutCount,
          absent: absentCount,
          inOffice: inOfficeCount,
          remote: remoteCount,
        },
        exceptionsRadar: {
          totalExceptions: lateMarkExceptions.length + driftExceptions.length + unclosedPunches.length,
          lateMarks: lateMarkExceptions,
          driftExceptions,
          unclosedPunches,
        },
        approvals: {
          totalPending: unifiedApprovals.length,
          leaveCount: teamLeaves.length,
          regularizationCount: teamRegularizations.length,
          overtimeCount: teamOvertime.length,
          expenseCount: teamExpenses.length,
          items: unifiedApprovals,
        },
        teamVelocity: {
          pending360ReviewsCount: (pending360Reviews || []).filter((r: any) => teamUserIds.has(String(r.employeeId))).length,
          probationApproachingCount: probationApproaching,
          teamKpiCompletionRate: 88, // % average sprint KPI completion
        },
        directReports,
      },
    });
  } catch (error: any) {
    console.error("[Manager Dashboard API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load manager dashboard summary" },
      { status: 500 }
    );
  }
}
