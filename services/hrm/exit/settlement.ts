import "server-only";
import {
  exitSettlementsService,
  employeeSalariesService,
  hrmUsersService,
  salaryAdvancesService,
} from "@/lib/hrm/firestore";
import { getLeaveBalances } from "@/services/hrm/leave";
import { getAssignments } from "@/services/hrm/assets";
import { triggerWorkflowEvent } from "@/services/hrm/workflow";
import type { ExitSettlement } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Full & Final (F&F) Settlement Service
// ══════════════════════════════════════════════════════════════════

export interface FnFCalculationResult {
  userId: string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  resignationDate: string;
  lastWorkingDate: string;
  isProbationary: boolean;
  noticePeriodRequiredDays: number;
  noticePeriodServedDays: number;
  noticeShortfallDays: number;
  leaveDaysAdjustedAgainstNotice?: number;
  // Earnings
  workedDaysSalary: number;
  leaveEncashmentDays: number;
  leaveEncashmentAmount: number;
  leaveEncashmentDailyRate: number;
  gratuityEligible: boolean;
  gratuityAmount: number;
  bonusOrIncentive: number;
  totalEarnings: number;
  // Deductions
  noticeRecoveryAmount: number;
  noticeRecoveryDailyRate: number;
  unreturnedAssetDeduction: number;
  loanOrAdvanceDeduction: number;
  statutoryDeductions: number;
  totalDeductions: number;
  // Net & Clearances
  netSettlementAmount: number;
  assetClearanceComplete: boolean;
  departmentClearanceComplete: boolean;
  financeClearanceComplete: boolean;
  hrClearanceComplete: boolean;
  allClearancesApproved: boolean;
}

export async function calculateFnFSettlement(
  tenantId: string = "default",
  userId: string,
  resignationDateStr: string,
  lastWorkingDateStr: string,
  overrides?: {
    bonusOrIncentive?: number;
    statutoryDeductions?: number;
    waiveNoticeRecovery?: boolean;
    unreturnedAssetDeduction?: number;
    offsetLeavesAgainstNotice?: boolean;
    departmentClearanceComplete?: boolean;
    hrClearanceComplete?: boolean;
  }
): Promise<FnFCalculationResult> {
  const [user, salaries, leaveBalances, assetAssignments, advances] = await Promise.all([
    hrmUsersService.findById(userId),
    employeeSalariesService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
    }),
    getLeaveBalances(tenantId, userId).catch(() => []),
    getAssignments(undefined, userId).catch(() => []),
    salaryAdvancesService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
    }).catch(() => []),
  ]);

  const employeeName = user
    ? (user.displayName || (user as any).name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email)
    : "Employee";
  const employeeCode = user?.employeeCode || (user as any)?.empId || "EMP-" + userId.slice(-4).toUpperCase();
  const department = (user as any)?.department || (user as any)?.departmentName || user?.departmentId || "General";
  const designation = (user as any)?.designation || (user as any)?.designationName || user?.designationId || "Employee";

  // Salary information
  const salary = salaries[0];
  const monthlyGross = (salary as any)?.grossSalary || 50000;
  const monthlyBasic = (salary as any)?.basicSalary || Math.round(monthlyGross * 0.5);

  // Statutory Divisors (Indian Labor Law):
  // - Notice Recovery: Gross / 30 calendar days
  // - Leave Encashment & Gratuity: Basic / 26 working days (Payment of Gratuity Act 1972)
  const noticeRecoveryDailyRate = Math.round(monthlyGross / 30);
  const leaveEncashmentDailyRate = Math.round(monthlyBasic / 26);
  const perDayGross = noticeRecoveryDailyRate;

  // Notice Period Resolution (Probation vs Confirmed)
  const isProbationary = (user as any)?.probationStatus === "active" || user?.status === "probation";
  const requiredDays = (user as any)?.noticePeriodDays || (isProbationary ? 15 : 60);

  const resignDate = new Date(resignationDateStr);
  const lwd = new Date(lastWorkingDateStr);
  const servedDays = Math.max(0, Math.round((lwd.getTime() - resignDate.getTime()) / (1000 * 60 * 60 * 24)));
  const shortfallDays = Math.max(0, requiredDays - servedDays);

  // Worked days salary in final month
  const workedDaysInLastMonth = lwd.getDate();
  const workedDaysSalary = Math.round(perDayGross * workedDaysInLastMonth);

  // Leave Encashment (Earned / Privilege Leaves)
  const earnedLeave = leaveBalances.find(
    (b) =>
      (b.leaveTypeName || b.leaveTypeId || "").toLowerCase().includes("earned") ||
      (b.leaveTypeName || b.leaveTypeId || "").toLowerCase().includes("privilege")
  );
  let leaveEncashmentDays = Math.max(0, earnedLeave?.remaining || 0);
  let netNoticeShortfallDays = shortfallDays;
  let leaveDaysAdjusted = 0;

  // Optional Notice Period Offset via Accrued Leaves
  if (overrides?.offsetLeavesAgainstNotice && shortfallDays > 0 && leaveEncashmentDays > 0) {
    leaveDaysAdjusted = Math.min(shortfallDays, leaveEncashmentDays);
    netNoticeShortfallDays = shortfallDays - leaveDaysAdjusted;
    leaveEncashmentDays -= leaveDaysAdjusted;
  }

  const noticeRecoveryAmount = overrides?.waiveNoticeRecovery ? 0 : netNoticeShortfallDays * noticeRecoveryDailyRate;
  const leaveEncashmentAmount = Math.round(leaveEncashmentDays * leaveEncashmentDailyRate);

  // Statutory Gratuity Calculation (Eligibility: >= 4.8 years, capped at Rs 20 Lakhs)
  const rawJoining = (user as any)?.dateOfJoining || (user as any)?.joiningDate;
  const joiningDate = rawJoining ? new Date(rawJoining) : (user?.createdAt ? new Date(user.createdAt as any) : new Date());
  const tenureYears = Math.max(0, (lwd.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const gratuityEligible = tenureYears >= 4.8;
  const completedYears = Math.round(tenureYears);
  const rawGratuity = gratuityEligible ? Math.round((15 * monthlyBasic * completedYears) / 26) : 0;
  const gratuityAmount = Math.min(2000000, rawGratuity); // Statutory cap of Rs 20,00,000

  // Multi-Department Clearance Checks
  const unreturnedAssets = assetAssignments.filter(
    (a) => (a.status === "active" || (a as any).status === "assigned") && !a.returnedDate
  );
  const assetClearanceComplete = unreturnedAssets.length === 0;
  const unreturnedAssetDeduction = overrides?.unreturnedAssetDeduction ?? (unreturnedAssets.length > 0 ? unreturnedAssets.length * 5000 : 0);

  const pendingAdvances = advances.filter((adv) => adv.status === "approved" || (adv as any).status === "disbursed");
  const loanOrAdvanceDeduction = pendingAdvances.reduce((sum, adv) => sum + (adv.requestedAmount || (adv as any).amount || 0), 0);
  const financeClearanceComplete = loanOrAdvanceDeduction === 0;

  const departmentClearanceComplete = overrides?.departmentClearanceComplete ?? true;
  const hrClearanceComplete = overrides?.hrClearanceComplete ?? true;
  const allClearancesApproved = assetClearanceComplete && financeClearanceComplete && departmentClearanceComplete && hrClearanceComplete;

  // Statutory Deductions (PF / PT / TDS on final payout)
  const statutoryDeductions = overrides?.statutoryDeductions ?? Math.round(workedDaysSalary * 0.12);
  const bonusOrIncentive = overrides?.bonusOrIncentive ?? 0;

  const totalEarnings = workedDaysSalary + leaveEncashmentAmount + gratuityAmount + bonusOrIncentive;
  const totalDeductions = noticeRecoveryAmount + unreturnedAssetDeduction + loanOrAdvanceDeduction + statutoryDeductions;
  const netSettlementAmount = totalEarnings - totalDeductions;

  return {
    userId,
    employeeName,
    employeeCode,
    department,
    designation,
    resignationDate: resignationDateStr,
    lastWorkingDate: lastWorkingDateStr,
    isProbationary,
    noticePeriodRequiredDays: requiredDays,
    noticePeriodServedDays: servedDays,
    noticeShortfallDays: netNoticeShortfallDays,
    leaveDaysAdjustedAgainstNotice: leaveDaysAdjusted,
    workedDaysSalary,
    leaveEncashmentDays,
    leaveEncashmentAmount,
    leaveEncashmentDailyRate,
    gratuityEligible,
    gratuityAmount,
    bonusOrIncentive,
    totalEarnings,
    noticeRecoveryAmount,
    noticeRecoveryDailyRate,
    unreturnedAssetDeduction,
    loanOrAdvanceDeduction,
    statutoryDeductions,
    totalDeductions,
    netSettlementAmount,
    assetClearanceComplete,
    departmentClearanceComplete,
    financeClearanceComplete,
    hrClearanceComplete,
    allClearancesApproved,
  };
}

export async function createExitSettlement(
  tenantId: string = "default",
  data: Partial<ExitSettlement> & { userId: string }
): Promise<ExitSettlement> {
  const settlement = await exitSettlementsService.createInTenant(tenantId, {
    ...data,
    status: data.status || "draft",
  });

  return settlement;
}

export async function getExitSettlements(
  tenantId: string = "default",
  status?: ExitSettlement["status"]
): Promise<ExitSettlement[]> {
  const where: any[] = [];
  if (status) {
    where.push({ field: "status", op: "==", value: status });
  }

  return exitSettlementsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getExitSettlementById(id: string): Promise<ExitSettlement | null> {
  return exitSettlementsService.findById(id);
}

export async function updateExitSettlement(
  id: string,
  data: Partial<ExitSettlement>
): Promise<ExitSettlement | null> {
  return exitSettlementsService.update(id, data);
}

export async function disburseExitSettlement(
  id: string,
  settledBy: string
): Promise<ExitSettlement | null> {
  const settlement = await exitSettlementsService.findById(id);
  if (!settlement) return null;

  const updated = await exitSettlementsService.update(id, {
    status: "disbursed",
    settledBy,
    settledAt: new Date() as any,
  });

  // Mark employee status as resigned/inactive
  await hrmUsersService.update(settlement.userId, {
    status: "resigned",
    isActive: false,
  } as any);

  // Trigger automation workflow
  await triggerWorkflowEvent(
    "settlement.disbursed",
    {
      userId: settlement.userId,
      employeeName: settlement.employeeName,
      netSettlementAmount: settlement.netSettlementAmount,
      settledBy,
      lastWorkingDate: settlement.lastWorkingDate,
    },
    settlement.tenantId
  ).catch(() => {});

  return updated;
}
