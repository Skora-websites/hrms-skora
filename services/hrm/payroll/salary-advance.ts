import "server-only";
import {
  salaryAdvancesService,
  employeeSalariesService,
  attendanceService,
} from "@/lib/hrm/firestore";
import type { SalaryAdvance } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Earned Wage Access (EWA) & Salary Advance Service
// ══════════════════════════════════════════════════════════════════

export interface AccrualCalculation {
  userId: string;
  month: string; // YYYY-MM
  daysInMonth: number;
  daysPassed: number;
  daysWorked: number;
  monthlyGross: number;
  dailyRate: number;
  accruedWage: number;
  maxEligiblePercentage: number;
  maxAdvanceAllowed: number;
  alreadyRequestedThisMonth: number;
  currentAvailableAdvance: number;
  currency: string;
}

export async function calculateAccruedWage(
  tenantId: string,
  userId: string
): Promise<AccrualCalculation> {
  const now = new Date();
  const year = now.getFullYear();
  const monthIdx = now.getMonth(); // 0-based
  const monthStr = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const daysPassed = now.getDate();

  // 1. Fetch user salary
  const userSalary = await employeeSalariesService.findOne("userId", userId);
  let monthlyGross = 50000; // default baseline if not configured
  if (userSalary && Number(userSalary.totalCtc) > 0) {
    monthlyGross = Math.round(Number(userSalary.totalCtc) / 12);
  }

  // 2. Count days worked in current month from attendance
  const startOfMonthStr = `${monthStr}-01`;
  const endOfMonthStr = `${monthStr}-${String(daysInMonth).padStart(2, "0")}`;

  const attendanceRecords = await attendanceService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
    ],
  });

  const monthAttendance = attendanceRecords.filter((a) => {
    const d = (a as any).date;
    return d && typeof d === "string" && d >= startOfMonthStr && d <= endOfMonthStr && (a as any).status !== "absent";
  });

  const daysWorked = monthAttendance.length > 0 ? monthAttendance.length : Math.max(1, daysPassed - Math.floor(daysPassed * 2 / 7));

  // 3. Accrual formula
  const dailyRate = Math.round((monthlyGross / daysInMonth) * 100) / 100;
  const accruedWage = Math.round(dailyRate * daysWorked);

  // Max 50% of accrued wages can be drawn before regular monthly payday
  const maxEligiblePercentage = 0.5;
  const maxAdvanceAllowed = Math.round(accruedWage * maxEligiblePercentage);

  // 4. Calculate existing advances already approved/pending in current month
  const existingAdvances = await salaryAdvancesService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
  });

  const activeThisMonth = existingAdvances.filter((adv) => {
    const advDate = new Date(adv.createdAt);
    const advMonth = `${advDate.getFullYear()}-${String(advDate.getMonth() + 1).padStart(2, "0")}`;
    return advMonth === monthStr && (adv.status === "pending" || adv.status === "approved" || adv.status === "disbursed");
  });

  const alreadyRequestedThisMonth = activeThisMonth.reduce(
    (sum, adv) => sum + Number(adv.requestedAmount || 0),
    0
  );

  const currentAvailableAdvance = Math.max(0, maxAdvanceAllowed - alreadyRequestedThisMonth);

  return {
    userId,
    month: monthStr,
    daysInMonth,
    daysPassed,
    daysWorked,
    monthlyGross,
    dailyRate,
    accruedWage,
    maxEligiblePercentage,
    maxAdvanceAllowed,
    alreadyRequestedThisMonth,
    currentAvailableAdvance,
    currency: "INR",
  };
}

export async function getSalaryAdvances(
  tenantId: string,
  options: {
    userId?: string;
    status?: string;
    month?: string;
    department?: string;
  } = {}
): Promise<SalaryAdvance[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.userId) {
    where.push({ field: "userId", op: "==", value: options.userId });
  }
  if (options.status) {
    where.push({ field: "status", op: "==", value: options.status });
  }

  let list = await salaryAdvancesService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  if (options.department) {
    const dLower = options.department.toLowerCase();
    list = list.filter((a) => a.department?.toLowerCase() === dLower);
  }

  if (options.month) {
    list = list.filter((a) => {
      const d = new Date(a.createdAt);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === options.month || a.deductedPayrollMonth === options.month;
    });
  }

  return list;
}

export async function getSalaryAdvanceById(id: string): Promise<SalaryAdvance | null> {
  return salaryAdvancesService.findById(id);
}

export async function requestSalaryAdvance(
  tenantId: string,
  data: {
    userId: string;
    employeeName: string;
    employeeEmail: string;
    department?: string;
    requestedAmount: number;
    reason: string;
  }
): Promise<SalaryAdvance> {
  const accrual = await calculateAccruedWage(tenantId, data.userId);

  const numAmount = Number(data.requestedAmount);
  if (numAmount <= 0) {
    throw new Error("Requested amount must be greater than 0");
  }

  if (numAmount > accrual.currentAvailableAdvance) {
    throw new Error(
      `Requested amount (₹${numAmount}) exceeds current accrued wage eligibility (₹${accrual.currentAvailableAdvance})`
    );
  }

  const now = new Date();
  const advance: Omit<SalaryAdvance, "id"> = {
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    requestedAmount: numAmount,
    maxEligibleAmount: accrual.currentAvailableAdvance,
    accruedWage: accrual.accruedWage,
    reason: data.reason,
    status: "pending",
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    disbursedAt: null,
    deductedPayrollMonth: accrual.month,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return salaryAdvancesService.create({
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    requestedAmount: numAmount,
    maxEligibleAmount: accrual.currentAvailableAdvance,
    accruedWage: accrual.accruedWage,
    reason: data.reason,
    status: "pending",
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    disbursedAt: null,
    deductedPayrollMonth: accrual.month,
  } as any);
}

export async function approveSalaryAdvance(
  id: string,
  approverId: string,
  approverName: string
): Promise<SalaryAdvance | null> {
  const existing = await salaryAdvancesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await salaryAdvancesService.update(id, {
    status: "approved",
    approvedBy: approverId,
    approvedByName: approverName,
    approvedAt: now,
    rejectionReason: undefined,
    updatedAt: now,
  });

  return salaryAdvancesService.findById(id);
}

export async function disburseSalaryAdvance(
  id: string,
  approverId: string,
  approverName: string
): Promise<SalaryAdvance | null> {
  const existing = await salaryAdvancesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await salaryAdvancesService.update(id, {
    status: "disbursed",
    approvedBy: approverId,
    approvedByName: approverName,
    disbursedAt: now,
    updatedAt: now,
  });

  return salaryAdvancesService.findById(id);
}

export async function rejectSalaryAdvance(
  id: string,
  approverId: string,
  approverName: string,
  reason: string
): Promise<SalaryAdvance | null> {
  const existing = await salaryAdvancesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await salaryAdvancesService.update(id, {
    status: "rejected",
    approvedBy: approverId,
    approvedByName: approverName,
    rejectionReason: reason,
    updatedAt: now,
  });

  return salaryAdvancesService.findById(id);
}

export async function markSalaryAdvanceDeducted(
  id: string,
  payrollMonth: string
): Promise<SalaryAdvance | null> {
  const now = new Date();
  await salaryAdvancesService.update(id, {
    status: "deducted",
    deductedPayrollMonth: payrollMonth,
    updatedAt: now,
  });
  return salaryAdvancesService.findById(id);
}
