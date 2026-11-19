import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { getDb, getMySQLPool, ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const auth = await requireSuperAdmin();
    if (isErrorResponse(auth)) return auth;

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
    const currentMonthIdx = now.getMonth();
    const currentMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;

    // 1. Parallel MySQL queries across collections
    const [
      allUsers,
      todayAttendance,
      activeSalaries,
      monthlyAdvances,
      pendingExpenses,
      onboardingTasks,
      auditLogs,
      activeSessionsCount,
      dbPingResult,
    ] = await Promise.all([
      // Users
      db.collection("users").find({
        tenantId,
      }).project({
        _id: 1,
        id: 1,
        email: 1,
        displayName: 1,
        name: 1,
        employeeCode: 1,
        department: 1,
        departmentName: 1,
        designation: 1,
        role: 1,
        status: 1,
        createdAt: 1,
        reportingManager: 1,
      }).toArray(),

      // Today attendance
      db.collection("attendance").find({
        tenantId,
        date: todayStr,
      }).toArray(),

      // Active salaries
      db.collection("employee_salaries").find({
        tenantId,
      }).toArray().catch(() => []),

      // Salary advances this month
      db.collection("salary_advances").find({
        tenantId,
        month: currentMonthIdx + 1,
        year: currentYear,
        status: { $in: ["approved", "disbursed", "paid"] },
      }).toArray().catch(() => []),

      // Pending expense claims
      db.collection("expenses").find({
        tenantId,
        status: { $in: ["pending", "submitted", "manager_approved", "approved_by_manager"] },
      }).toArray().catch(() => []),

      // Pending onboarding tasks
      db.collection("onboarding_tasks").find({
        tenantId,
        status: { $in: ["pending", "pending_review", "submitted", "in_progress"] },
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Audit logs (last 10)
      db.collection("audit_logs").find({
        tenantId,
      }).sort({ createdAt: -1 }).limit(10).toArray().catch(() => []),

      // Active sessions count
      db.collection("sessions").countDocuments({
        expiresAt: { $gt: now },
      }).catch(() => 0),

      // Direct MySQL engine ping
      (async () => {
        try {
          const pingStart = Date.now();
          const pool = getMySQLPool();
          await pool.query("SELECT 1 AS ping");
          return { ok: true, latencyMs: Date.now() - pingStart };
        } catch {
          return { ok: false, latencyMs: -1 };
        }
      })(),
    ]);

    // Filter out CEO/Super Admin from regular employee roster
    const regularUsers = (allUsers as any[]).filter((u: any) => {
      const r = (u.role || "").toLowerCase();
      return r !== "super_admin" && r !== "superadmin" && r !== "ceo";
    });

    const activeEmployees = regularUsers.filter((u: any) =>
      u.status !== "inactive" && u.status !== "disabled" && u.status !== "terminated"
    );

    const managersList = (allUsers as any[]).filter((u: any) => {
      const r = (u.role || "").toLowerCase();
      return r === "manager" && u.status === "active";
    }).map((m: any) => ({
      id: m._id ? m._id.toString() : m.id,
      name: m.displayName || m.name || m.email,
      email: m.email,
      department: m.department || m.departmentName || "General",
    }));

    // 2. Financial Burn Computations
    const salaryByUserId = new Map<string, any>();
    for (const sal of activeSalaries as any[]) {
      if (sal.userId) salaryByUserId.set(String(sal.userId), sal);
    }

    let totalMonthlyGrossCommitment = 0;
    let totalEmployerEpfo = 0;
    let totalEmployerEsic = 0;

    for (const emp of activeEmployees) {
      const empId = emp._id ? emp._id.toString() : emp.id;
      const sal = salaryByUserId.get(empId);
      const grossMonthly = Number(sal?.grossSalary || (sal?.ctc ? sal.ctc / 12 : 35000));
      const basicMonthly = Number(sal?.basicSalary || grossMonthly * 0.5);

      totalMonthlyGrossCommitment += grossMonthly;

      // EPFO: 13% (12% PF + 0.5% admin + 0.5% EDLI), ceiling ₹15,000/mo
      const pfWage = Math.min(basicMonthly, 15000);
      totalEmployerEpfo += Math.round(pfWage * 0.13);

      // ESIC: 3.25% if gross <= ₹21,000
      if (grossMonthly <= 21000) {
        totalEmployerEsic += Math.round(grossMonthly * 0.0325);
      }
    }

    const totalAdvancesDisbursed = (monthlyAdvances as any[]).reduce(
      (sum: number, adv: any) => sum + (Number(adv.amount) || 0),
      0
    );

    const totalPendingExpenses = (pendingExpenses as any[]).reduce(
      (sum: number, exp: any) => sum + (Number(exp.amount) || 0),
      0
    );

    const totalProjectedBurn = Math.round(
      totalMonthlyGrossCommitment + totalEmployerEpfo + totalEmployerEsic + totalPendingExpenses
    );

    // 3. Operations & AUX Live Radar
    const attendanceByUser = new Map<string, any>();
    for (const att of todayAttendance as any[]) {
      if (att.userId) attendanceByUser.set(String(att.userId), att);
    }

    let punchedInCount = 0;
    let activeAuxCount = 0;
    let onBreakCount = 0;
    let inMeetingCount = 0;
    let punchedOutCount = 0;
    let inOfficeCount = 0;
    let remoteCount = 0;

    const liveEmployeesList = activeEmployees.map((u: any) => {
      const empId = u._id ? u._id.toString() : u.id;
      const att = attendanceByUser.get(empId);

      let status = "absent";
      let auxState = null;
      let punchInTime = null;
      let punchOutTime = null;
      let workLocation: "office" | "remote" | null = null;
      let elapsedMins = 0;

      if (att) {
        punchInTime = att.punchInTime || null;
        punchOutTime = att.punchOutTime || null;
        workLocation = (att.workLocation as any) || (att.location?.toLowerCase().includes("office") ? "office" : "remote");

        if (att.punchOutTime) {
          status = "punched_out";
          punchedOutCount++;
        } else if (att.punchInTime) {
          status = "punched_in";
          punchedInCount++;
          if (workLocation === "office") inOfficeCount++;
          else remoteCount++;

          auxState = att.auxState || "active";
          if (auxState === "on_break") onBreakCount++;
          else if (auxState === "meeting") inMeetingCount++;
          else activeAuxCount++;

          const inMs = new Date(att.punchInTime).getTime();
          elapsedMins = Math.max(0, Math.round((now.getTime() - inMs) / 60000));
        }
      }

      return {
        userId: empId,
        name: u.displayName || u.name || u.email,
        email: u.email,
        employeeCode: u.employeeCode || "—",
        department: u.department || u.departmentName || "General",
        designation: u.designation || "Staff",
        role: u.role || "employee",
        reportingManager: u.reportingManager || null,
        status,
        auxState,
        punchInTime,
        punchOutTime,
        workLocation,
        elapsedMins,
      };
    });

    const absentCount = Math.max(0, activeEmployees.length - punchedInCount - punchedOutCount);

    // 4. CEO Governance Queue
    // a. Employees without reporting manager (and who are not managers or superadmins)
    const unassignedManagersQueue = activeEmployees
      .filter((u: any) => {
        const r = (u.role || "").toLowerCase();
        return r !== "manager" && (!u.reportingManager || u.reportingManager === "unassigned" || u.reportingManager === "");
      })
      .map((u: any) => ({
        id: u._id ? u._id.toString() : u.id,
        name: u.displayName || u.name || u.email,
        email: u.email,
        department: u.department || u.departmentName || "General",
        designation: u.designation || "Staff",
        role: u.role,
      }));

    // b. 48h Candidate Onboarding Escalations
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600 * 1000);
    const onboardingEscalations = (onboardingTasks as any[])
      .filter((t: any) => {
        const taskCreated = t.createdAt ? new Date(t.createdAt) : null;
        return taskCreated && taskCreated < fortyEightHoursAgo;
      })
      .map((t: any) => {
        const createdMs = new Date(t.createdAt).getTime();
        const overdueHours = Math.max(0, Math.round((now.getTime() - createdMs) / 3600000));
        return {
          id: t._id ? t._id.toString() : t.id,
          candidateName: t.employeeName || t.candidateName || t.userEmail || "Candidate",
          email: t.userEmail || t.email || "—",
          department: t.department || "General",
          taskName: t.taskName || t.documentName || "Document Verification",
          overdueHours,
          status: t.status,
          createdAt: t.createdAt,
        };
      });

    // 5. System Health & Audit Trail
    const formattedAuditLogs = (auditLogs as any[]).map((log: any) => ({
      id: log._id ? log._id.toString() : log.id,
      action: log.action || "audit_event",
      performedByName: log.performedByName || "System",
      targetUserEmail: log.targetUserEmail || "—",
      details: log.details || "",
      createdAt: log.createdAt || new Date().toISOString(),
    }));

    const responsePayload = {
      financialBurn: {
        totalMonthlyGrossCommitment,
        employerEpfo: totalEmployerEpfo,
        employerEsic: totalEmployerEsic,
        advancesDisbursed: totalAdvancesDisbursed,
        pendingExpenses: totalPendingExpenses,
        totalProjectedBurn,
        activeEmployeeCount: activeEmployees.length,
      },
      operationsRadar: {
        totalHeadcount: activeEmployees.length,
        punchedIn: punchedInCount,
        activeAux: activeAuxCount,
        onBreak: onBreakCount,
        inMeeting: inMeetingCount,
        punchedOut: punchedOutCount,
        absent: absentCount,
        inOffice: inOfficeCount,
        remote: remoteCount,
        liveEmployees: liveEmployeesList,
      },
      governanceQueue: {
        unassignedManagers: unassignedManagersQueue,
        onboardingEscalations,
        totalUnassigned: unassignedManagersQueue.length,
        totalEscalations: onboardingEscalations.length,
        availableManagers: managersList,
      },
      systemHealth: {
        engine: "MySQL 8.0 (Pure SQL via mysql2)",
        databaseStatus: dbPingResult.ok ? "operational" : "degraded",
        pingLatencyMs: dbPingResult.latencyMs,
        activeSessions: activeSessionsCount,
        noMongoNotice: "100% pure MySQL relational store",
        auditLogs: formattedAuditLogs,
      },
      directory: regularUsers.map((u: any) => ({
        id: u._id ? u._id.toString() : u.id,
        displayName: u.displayName || u.name,
        email: u.email,
        department: u.department || u.departmentName || "General",
        designation: u.designation || "Staff",
        role: u.role || "employee",
        status: u.status || "active",
        reportingManager: u.reportingManager || "",
        createdAt: u.createdAt,
      })),
      meta: {
        executionTimeMs: Date.now() - startTime,
        asOf: now.toISOString(),
      },
    };

    return NextResponse.json({ success: true, data: responsePayload });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch superadmin summary" },
      { status: 500 }
    );
  }
}
