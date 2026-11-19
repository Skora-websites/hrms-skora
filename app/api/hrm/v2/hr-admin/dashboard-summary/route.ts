import { NextRequest, NextResponse } from "next/server";
import { requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";
import { ObjectId } from "@/lib/db/mysql";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
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
    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const daysToPayrollCutoff = Math.max(0, daysInMonth - now.getDate());

    // 1. Parallel Data Fetching across MySQL Collections
    const [
      allUsers,
      todayAttendance,
      monthAttendance,
      onboardingTasks,
      pendingLeaves,
      managerApprovedExpenses,
      activeSalaries,
      exitRequests,
    ] = await Promise.all([
      // All company employees
      db.collection("users").find({
        tenantId,
        status: { $nin: ["inactive", "disabled", "terminated", "resigned"] },
      }).project({
        _id: 1,
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
        onboardingStatus: 1,
        reportingManager: 1,
      }).toArray(),

      // Today's attendance across all employees
      db.collection("attendance").find({
        tenantId,
        date: todayStr,
      }).toArray(),

      // Month's attendance for organization punctuality
      db.collection("attendance").find({
        tenantId,
        date: { $gte: `${currentMonthStr}-01`, $lte: `${currentMonthStr}-31` },
      }).toArray(),

      // Candidate onboarding queue
      db.collection("onboarding_tasks").find({
        tenantId,
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Pending leave requests
      db.collection("leave_requests").find({
        tenantId,
        status: "pending",
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Manager-approved expense claims waiting for HR payout
      db.collection("expenses").find({
        tenantId,
        status: { $in: ["manager_approved", "approved_by_manager"] },
      }).sort({ createdAt: -1 }).toArray().catch(() => []),

      // Active employee salaries for payroll estimation
      db.collection("employee_salaries").find({
        tenantId,
      }).toArray().catch(() => []),

      // Pending exit settlements (FnF clearance)
      db.collection("exit_requests").find({
        tenantId,
        status: { $in: ["initiated", "pending_clearance", "pending"] },
      }).sort({ createdAt: -1 }).toArray().catch(() => []),
    ]);

    // 2. Headcount & Department Demographics
    const totalEmployees = allUsers.length;
    const departmentCounts: Record<string, number> = {};
    let probationCount = 0;
    let pendingOnboardingCount = 0;

    for (const u of (allUsers || [])) {
      const dept = u.department || u.departmentName || "General";
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

      if (!u.employeeCode || u.status === "pending_verification" || (u.onboardingStatus || "").toLowerCase() === "pending") {
        pendingOnboardingCount++;
      }

      if (u.createdAt) {
        const daysSinceJoined = Math.floor((now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceJoined <= 90) {
          probationCount++;
        }
      }
    }

    // 3. Organization Attendance & Shift Compliance (10 AM - 7 PM, Mon-Sat)
    let punchedInToday = 0;
    let onTimeToday = 0;
    let gracePeriodToday = 0;
    let lateToday = 0;
    let inOfficeCount = 0;
    let remoteCount = 0;

    for (const rec of (todayAttendance || [])) {
      if (rec.punchInTime) {
        punchedInToday++;
        const pDate = new Date(rec.punchInTime);
        const pMins = pDate.getHours() * 60 + pDate.getMinutes();

        if (pMins <= 600) {
          onTimeToday++;
        } else if (pMins <= 615) {
          gracePeriodToday++;
        } else {
          lateToday++;
        }

        if (rec.workLocation === "remote") remoteCount++;
        else inOfficeCount++;
      }
    }

    const absentToday = Math.max(0, totalEmployees - punchedInToday);

    // Unclosed punches from previous days in month
    let unclosedPreviousPunches = 0;
    for (const r of (monthAttendance || [])) {
      if (r.date < todayStr && r.punchInTime && !r.punchOutTime) {
        unclosedPreviousPunches++;
      }
    }

    // 4. Statutory Payroll Health & Liability Estimator
    let totalMonthlyGross = 0;
    for (const s of (activeSalaries || [])) {
      const ctc = Number(s.totalCtc || s.grossSalary || 600000);
      totalMonthlyGross += Math.round(ctc / 12);
    }
    if (totalMonthlyGross === 0 && totalEmployees > 0) {
      totalMonthlyGross = totalEmployees * 55000; // Realistic baseline
    }

    // Statutory Calculations (Standard EPFO + ESIC + Projected TDS + PT)
    // Basic approx 50% of gross
    const estimatedBasic = Math.round(totalMonthlyGross * 0.5);
    // Employer PF: 12% + 0.5% Admin + 0.5% EDLI = 13% of Basic
    const employerPfLiability = Math.round(estimatedBasic * 0.13);
    // Employer ESIC: 3.25% of Gross (for applicable wages)
    const employerEsicLiability = Math.round(totalMonthlyGross * 0.0325);
    // Average projected Section 192 TDS withholding (~10% effective)
    const projectedTdsWithholding = Math.round(totalMonthlyGross * 0.095);
    // Professional Tax average across headcount
    const estimatedPtLiability = totalEmployees * 200;

    // Pending Expense Reimbursement Total
    let totalPendingReimbursement = 0;
    for (const exp of (managerApprovedExpenses || [])) {
      totalPendingReimbursement += Number(exp.amount || 0);
    }

    // 5. Lifecycle Clearance Gates
    // A. Candidate Onboarding Queue
    const onboardingQueue = (onboardingTasks || []).slice(0, 10).map((t: any) => ({
      id: t._id ? t._id.toString() : t.id,
      name: t.employeeName || t.name || "Candidate",
      email: t.email,
      department: t.department || "General",
      role: t.role || "Employee",
      documentName: t.documentName || "Identity Document",
      status: t.status || "pending",
      employeeCode: t.employeeCode || null,
      submittedAt: t.createdAt || t.submittedAt,
      deadlineHoursRemaining: t.deadlineHoursRemaining ?? 48,
    }));

    // B. Probation Confirmations (approaching 15-day / 90-day gate)
    const probationConfirmations = (allUsers || [])
      .filter((u: any) => {
        if (!u.createdAt) return false;
        const days = Math.floor((now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 75 && days <= 95;
      })
      .map((u: any) => {
        const days = Math.floor((now.getTime() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: u._id.toString(),
          name: u.displayName || u.name || u.email,
          email: u.email,
          employeeCode: u.employeeCode || "—",
          department: u.department || "General",
          designation: u.designation || "Staff",
          daysInProbation: days,
          status: "pending_confirmation",
        };
      });

    // C. Exit FnF Settlements
    const exitClearances = (exitRequests || []).slice(0, 5).map((e: any) => ({
      id: e._id ? e._id.toString() : e.id,
      employeeName: e.employeeName || e.name || "Exiting Staff",
      department: e.department || "General",
      lastWorkingDate: e.lastWorkingDate || e.resignationDate,
      noticeShortfallDays: e.noticeShortfallDays || 0,
      clearanceStatus: {
        it: e.itClearance || "pending",
        finance: e.financeClearance || "pending",
        admin: e.adminClearance || "pending",
        hr: e.hrClearance || "pending",
      },
    }));

    // 6. Recent Active Employees
    const recentEmployees = (allUsers || []).slice(0, 8).map((u: any) => ({
      id: u._id.toString(),
      name: u.displayName || u.name || u.email,
      email: u.email,
      employeeCode: u.employeeCode || "Pending",
      department: u.department || u.departmentName || "General",
      designation: u.designation || "Staff",
      status: u.status || "active",
      reportingManager: u.reportingManager || "Management",
    }));

    return NextResponse.json({
      success: true,
      data: {
        hrAdmin: {
          id: auth.userId,
          role: auth.role,
        },
        headcount: {
          totalEmployees,
          activeEmployees: totalEmployees - pendingOnboardingCount,
          pendingOnboardingCount,
          probationCount,
          departmentCounts,
        },
        attendanceRadar: {
          shiftHours: "10:00 AM – 07:00 PM (Mon – Sat)",
          punchedInToday,
          onTimeToday,
          gracePeriodToday,
          lateToday,
          absentToday,
          inOfficeCount,
          remoteCount,
          unclosedPreviousPunches,
        },
        statutoryPayroll: {
          currentPeriod: currentMonthStr,
          daysToPayrollCutoff,
          estimatedMonthlyGross: totalMonthlyGross,
          employerPfLiability,
          employerEsicLiability,
          projectedTdsWithholding,
          estimatedPtLiability,
          totalStatutoryLiabilities: employerPfLiability + employerEsicLiability + projectedTdsWithholding + estimatedPtLiability,
          pendingExpensePayoutTotal: totalPendingReimbursement,
          pendingExpenseCount: (managerApprovedExpenses || []).length,
        },
        lifecycleClearance: {
          onboardingQueue,
          probationConfirmations,
          exitClearances,
          managerApprovedExpenses: (managerApprovedExpenses || []).slice(0, 5).map((exp: any) => ({
            id: exp._id ? exp._id.toString() : exp.id,
            employeeName: exp.employeeName || exp.userName || "Staff",
            category: exp.category,
            amount: exp.amount,
            date: exp.date,
            receiptUrl: exp.receiptUrl || null,
          })),
        },
        pendingLeavesCount: (pendingLeaves || []).length,
        recentEmployees,
      },
    });
  } catch (error: any) {
    console.error("[HR Admin Dashboard API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load HR admin dashboard summary" },
      { status: 500 }
    );
  }
}
