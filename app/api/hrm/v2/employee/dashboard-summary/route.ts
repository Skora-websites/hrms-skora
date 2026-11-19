import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mysql";
import { ObjectId } from "@/lib/db/mysql";
import { calculateAccruedWage } from "@/services/hrm/payroll/salary-advance";
import { getLeaveBalances } from "@/services/hrm/leave";
import { getRemainingMonthlyAllowance, getKudosFeed } from "@/services/hrm/engage/kudos";
import { getHolidays } from "@/services/hrm/holiday";
import { evaluateDailyAttendance } from "@/services/hrm/attendance/shifts";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = auth.tenantId || "default";
    const userId = auth.userId;

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

    // 1. Fetch User Record
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Parallel queries for maximum speed (< 80ms)
    const [
      todayAttendance,
      monthAttendanceRecords,
      accrual,
      leaveBalances,
      kudosAllowance,
      recentKudos,
      holidays,
      pendingTasksCount,
      recentPayslips,
      pendingRegularizations,
    ] = await Promise.all([
      // Today's attendance
      db.collection("attendance").findOne({
        userId,
        tenantId,
        date: todayStr,
      }),

      // Month's attendance for punctuality & health ring
      db.collection("attendance").find({
        userId,
        tenantId,
        date: { $gte: `${currentMonthStr}-01`, $lte: `${currentMonthStr}-31` },
      }).toArray(),

      // Real-time Accrued Wage
      calculateAccruedWage(tenantId, userId).catch(() => ({
        accruedWage: 0,
        maxAdvanceAllowed: 0,
        currentAvailableAdvance: 0,
        alreadyRequestedThisMonth: 0,
        monthlyGross: 50000,
      })),

      // Leave Balances
      getLeaveBalances(tenantId, userId).catch(() => []),

      // Kudos Allowance (100 pt monthly budget)
      getRemainingMonthlyAllowance(tenantId, userId).catch(() => ({
        monthlyBudget: 100,
        pointsGiven: 0,
        remainingPoints: 100,
      })),

      // Recent Kudos received
      getKudosFeed(tenantId, { userId, limit: 3 }).catch(() => []),

      // Holidays for upcoming countdown
      getHolidays(tenantId, undefined, currentYear).catch(() => []),

      // Assigned pending tasks
      db.collection("tasks").countDocuments({
        assignedTo: userId,
        status: { $in: ["pending", "in_progress", "todo"] },
      }).catch(() => 0),

      // Recent 3 payslips
      db.collection("payroll_transactions").find({
        userId,
        tenantId,
      }).sort({ createdAt: -1 }).limit(3).toArray().catch(() => []),

      // Pending regularizations count
      db.collection("regularization_requests").countDocuments({
        userId,
        tenantId,
        status: "pending",
      }).catch(() => 0),
    ]);

    // 3. Compute Shift & Punctuality Status for Today
    let punctualityStatus: "on_time" | "grace" | "late" | "not_checked_in" | "half_day" = "not_checked_in";
    let lateMinutes = 0;
    let effectiveHours = 0;

    if (todayAttendance?.punchInTime) {
      const evalResult = evaluateDailyAttendance({
        date: todayStr,
        checkIn: todayAttendance.punchInTime,
        checkOut: todayAttendance.punchOutTime,
        totalBreakMinutes: todayAttendance.totalBreakMinutes || 0,
        isCurrentDayCompleted: Boolean(todayAttendance.punchOutTime),
      });

      lateMinutes = evalResult.lateMinutes;
      effectiveHours = evalResult.workHours;

      const punchInDate = new Date(todayAttendance.punchInTime);
      const inMinutes = punchInDate.getHours() * 60 + punchInDate.getMinutes();

      if (inMinutes <= 600) {
        punctualityStatus = "on_time";
      } else if (inMinutes <= 615) {
        punctualityStatus = "grace";
      } else {
        punctualityStatus = "late";
      }
    }

    // 4. Monthly Attendance Metrics (Days present, late marks, half days, absences)
    let daysPresent = 0;
    let lateMarksThisMonth = 0;
    let halfDaysThisMonth = 0;

    for (const rec of (monthAttendanceRecords || [])) {
      if ((rec as any).status === "present") daysPresent++;
      if ((rec as any).status === "half_day") halfDaysThisMonth++;

      if ((rec as any).punchInTime) {
        const pDate = new Date((rec as any).punchInTime);
        const pMins = pDate.getHours() * 60 + pDate.getMinutes();
        if (pMins > 615) {
          lateMarksThisMonth++;
        }
      }
    }

    // 5. Calculate Next Upcoming Holiday
    const futureHolidays = (holidays || [])
      .map((h: any) => {
        const dStr =
          h.date instanceof Date
            ? h.date.toISOString().slice(0, 10)
            : typeof h.date === "string"
            ? h.date.slice(0, 10)
            : new Date(h.date).toISOString().slice(0, 10);
        return { ...h, dateStr: dStr };
      })
      .filter((h: any) => h.dateStr >= todayStr)
      .sort((a: any, b: any) => a.dateStr.localeCompare(b.dateStr));

    let upcomingHoliday: { name: string; date: string; daysRemaining: number } | null = null;
    if (futureHolidays.length > 0) {
      const nextH = futureHolidays[0];
      const targetTime = new Date(nextH.dateStr).getTime();
      const todayTime = new Date(todayStr).getTime();
      const diffDays = Math.max(0, Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24)));
      upcomingHoliday = {
        name: nextH.name || "Holiday",
        date: nextH.dateStr,
        daysRemaining: diffDays,
      };
    }

    // 6. Onboarding & Verification Gate State
    const hasEmployeeCode = Boolean(user.employeeCode);
    const onboardingStatus = String(user.onboardingStatus || "completed").toLowerCase();
    const isRejected = onboardingStatus.includes("reject");
    const isPending = !hasEmployeeCode || onboardingStatus === "pending" || user.status === "pending_verification";
    const isVerified = hasEmployeeCode && !isRejected && !isPending;

    // 7. Structure the comprehensive response
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: userId,
          name: user.displayName || user.firstName || user.name || "Employee",
          email: user.email,
          employeeCode: user.employeeCode || null,
          department: user.department || user.departmentName || "General",
          designation: user.designation || "Staff",
          reportingManager: user.reportingManager || "HR Operations",
          avatar: user.image || null,
          isVerified,
          isPending,
          isRejected,
          onboardingStatus: user.onboardingStatus || "active",
        },
        shift: {
          schedule: "10:00 AM – 07:00 PM (Mon – Sat)",
          officeStart: "10:00 AM",
          graceCutoff: "10:15 AM",
          officeEnd: "07:00 PM",
          isPunchedIn: Boolean(todayAttendance?.punchInTime && !todayAttendance?.punchOutTime),
          isPunchedOut: Boolean(todayAttendance?.punchOutTime),
          punchInTime: todayAttendance?.punchInTime || null,
          punchOutTime: todayAttendance?.punchOutTime || null,
          auxState: todayAttendance?.auxState || "active",
          punctualityStatus,
          lateMinutes,
          effectiveHours,
          todayDate: todayStr,
        },
        financial: {
          accruedWage: (accrual as any).accruedWage || 0,
          maxAdvanceAllowed: (accrual as any).maxAdvanceAllowed || 0,
          currentAvailableAdvance: (accrual as any).currentAvailableAdvance || 0,
          alreadyRequestedThisMonth: (accrual as any).alreadyRequestedThisMonth || 0,
          monthlyGross: (accrual as any).monthlyGross || 50000,
          currency: "INR",
        },
        leaveSummary: {
          totalRemaining: (leaveBalances || []).reduce((sum: number, b: any) => sum + (b.remaining || 0), 0),
          balances: leaveBalances || [],
        },
        attendanceHealth: {
          daysPresent,
          lateMarksThisMonth,
          halfDaysThisMonth,
          maxAllowedLateMarks: 3,
        },
        upcomingHoliday,
        culture: {
          kudosBudget: kudosAllowance.monthlyBudget,
          remainingPointsToGive: kudosAllowance.remainingPoints,
          recentKudosReceived: recentKudos || [],
        },
        actions: {
          pendingTasksCount,
          pendingRegularizations,
        },
        recentPayslips: (recentPayslips || []).map((p: any) => ({
          id: p._id.toString(),
          month: p.month || p.payrollPeriod || "Current",
          year: p.year || currentYear,
          netPay: p.netSalary || p.netPay || 0,
          status: p.status || "paid",
        })),
      },
    });
  } catch (error: any) {
    console.error("[Dashboard Summary API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}
