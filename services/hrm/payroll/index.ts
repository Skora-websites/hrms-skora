import "server-only";
import {
  payGroupsService,
  payGroupComponentsService,
  salaryComponentsService,
  payrollRunsService,
  payrollTransactionsService,
  payslipTemplatesService,
  employeeSalariesService,
  employeeSalaryHistoryService,
  attendanceService,
  salaryAdvancesService,
} from "@/lib/hrm/firestore";
import {
  getStatutoryConfig,
  calculateEarnedSalary,
  calculatePF,
  calculateESI,
  calculatePT,
  calculateNewRegimeTax,
} from "@/services/hrm/payroll/statutory";
import type {
  PayGroup,
  PayGroupComponent,
  SalaryComponent,
  PayrollRun,
  PayrollTransaction,
  PayslipTemplate,
  EmployeeSalary,
  EmployeeSalaryHistory,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Payroll Service
// ══════════════════════════════════════════════════════════════════

// ── Pay Groups ─────────────────────────────────────────

export async function getPayGroups(tenantId: string): Promise<PayGroup[]> {
  return payGroupsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getPayGroupById(id: string): Promise<PayGroup | null> {
  return payGroupsService.findById(id);
}

export async function createPayGroup(tenantId: string, data: Partial<PayGroup>): Promise<PayGroup> {
  return payGroupsService.create({ ...data, tenantId } as any);
}

export async function updatePayGroup(id: string, data: Partial<PayGroup>): Promise<PayGroup | null> {
  return payGroupsService.update(id, data as any);
}

export async function deletePayGroup(id: string): Promise<boolean> {
  return payGroupsService.delete(id);
}

// ── Salary Components ──────────────────────────────────

export async function getSalaryComponents(tenantId: string): Promise<SalaryComponent[]> {
  return salaryComponentsService.findManyInTenant(tenantId, {
    orderByField: "sortOrder",
    orderByDirection: "asc",
  });
}

export async function getSalaryComponentById(id: string): Promise<SalaryComponent | null> {
  return salaryComponentsService.findById(id);
}

export async function createSalaryComponent(tenantId: string, data: Partial<SalaryComponent>): Promise<SalaryComponent> {
  return salaryComponentsService.create({ ...data, tenantId } as any);
}

export async function updateSalaryComponent(id: string, data: Partial<SalaryComponent>): Promise<SalaryComponent | null> {
  return salaryComponentsService.update(id, data as any);
}

export async function deleteSalaryComponent(id: string): Promise<boolean> {
  return salaryComponentsService.delete(id);
}

// ── Pay Group Components ───────────────────────────────

export async function getPayGroupComponents(payGroupId: string): Promise<PayGroupComponent[]> {
  return payGroupComponentsService.findMany({
    where: [{ field: "payGroupId", op: "==", value: payGroupId }],
  });
}

export async function addComponentToPayGroup(
  tenantId: string,
  data: Partial<PayGroupComponent>
): Promise<PayGroupComponent> {
  return payGroupComponentsService.create({ ...data, tenantId } as any);
}

export async function removeComponentFromPayGroup(id: string): Promise<boolean> {
  return payGroupComponentsService.delete(id);
}

// ── Employee Salary ────────────────────────────────────

export async function getEmployeeSalary(userId: string): Promise<EmployeeSalary | null> {
  return employeeSalariesService.findOne("userId", userId);
}

export async function setEmployeeSalary(
  tenantId: string,
  data: {
    userId: string;
    payGroupId: string;
    components: EmployeeSalary["components"];
    totalCtc: number;
    effectiveFrom: Date;
  }
): Promise<EmployeeSalary> {
  // Deactivate existing salary
  const existing = await getEmployeeSalary(data.userId);
  if (existing) {
    await employeeSalariesService.update(existing.id, {
      status: "inactive",
      effectiveTo: data.effectiveFrom,
    } as any);

    await employeeSalaryHistoryService.create({
      userId: data.userId,
      previousCtc: existing.totalCtc,
      newCtc: data.totalCtc,
      changeReason: "Salary revision",
      changedById: "",
      effectiveDate: data.effectiveFrom,
      components: existing.components,
    } as any);
  }

  return employeeSalariesService.create({
    ...data,
    status: "active",
    tenantId,
  } as any);
}

// ── Payroll Processing ─────────────────────────────────

export async function getPayrollRuns(
  tenantId: string,
  payGroupId?: string
): Promise<PayrollRun[]> {
  const where = payGroupId
    ? [{ field: "payGroupId", op: "==" as const, value: payGroupId }]
    : [];
  return payrollRunsService.findManyInTenant(tenantId, {
    where,
    orderByField: "processedAt",
    orderByDirection: "desc",
  });
}

export async function getPayrollRunById(id: string): Promise<PayrollRun | null> {
  return payrollRunsService.findById(id);
}

export async function processPayroll(
  tenantId: string,
  payGroupId: string,
  periodStart: Date,
  periodEnd: Date,
  processedBy: string
): Promise<PayrollRun> {
  // Period sanity: a payroll period must be a valid, bounded range.
  if (
    !Number.isFinite(periodStart.getTime()) ||
    !Number.isFinite(periodEnd.getTime()) ||
    periodEnd.getTime() < periodStart.getTime()
  ) {
    throw new Error("Invalid payroll period: end must be on or after start");
  }

  // 1. Resolve or create standard pay group
  let payGroup = payGroupId && payGroupId !== "default" ? await payGroupsService.findById(payGroupId) : null;

  if (!payGroup) {
    const existingGroups = await payGroupsService.findManyInTenant(tenantId);
    if (existingGroups.length > 0) {
      payGroup = existingGroups[0];
    } else {
      payGroup = await payGroupsService.create({
        name: "Standard Monthly Pay Group",
        description: "Default standard monthly payroll cycle for all company employees",
        payFrequency: "monthly",
        payDay: 30,
        currency: "INR",
        isActive: true,
        tenantId,
      } as any);
    }
  }

  const effectivePayGroupId = payGroup.id;

  // Duplicate-period guard — AFTER pay-group resolution so the stored
  // effectivePayGroupId is compared. Running payroll twice for the same
  // pay group over an overlapping period would create a second paid
  // transaction per employee (double disbursement on paper and inflated
  // dashboards).
  const existingRuns = await payrollRunsService.findManyInTenant(tenantId, {
    where: [{ field: "payGroupId", op: "==", value: effectivePayGroupId }],
  });
  const duplicate = existingRuns.find(
    (r) =>
      r.status !== "failed" &&
      new Date(r.periodStart as any).getTime() <= periodEnd.getTime() &&
      new Date(r.periodEnd as any).getTime() >= periodStart.getTime()
  );
  if (duplicate) {
    throw new Error(
      `Payroll for this pay group already covers a period overlapping ${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)} (run ${duplicate.id})`
    );
  }

  // 2. Fetch all active workforce employees (excluding super_admin)
  const { getEmployees } = await import("@/services/hrm/employee");
  const employees = await getEmployees(tenantId);

  // 3. Create initial payroll run
  const payrollRun = await payrollRunsService.create({
    payGroupId: effectivePayGroupId,
    payGroupName: payGroup.name,
    periodStart,
    periodEnd,
    processedBy,
    processedAt: new Date(),
    totalEmployees: employees.length,
    totalGross: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalNetPay: 0,
    status: "processing",
    tenantId,
  } as any);

  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  // Fetch statutory compliance config for tenant
  const statutoryConfig = await getStatutoryConfig(tenantId);
  const startStr = periodStart.toISOString().slice(0, 10);
  const endStr = periodEnd.toISOString().slice(0, 10);
  const totalDaysInPeriod = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  // 4. Process each employee
  for (const emp of employees) {
    const salaryDoc = await employeeSalariesService.findOne("userId", emp.id);

    let masterGross = 0;
    let masterBasic = 0;
    let earnings: Record<string, number> = {};
    let deductions: Record<string, number> = {};

    if (salaryDoc && Array.isArray(salaryDoc.components) && salaryDoc.components.length > 0) {
      for (const comp of salaryDoc.components) {
        if (comp.type === "earning") {
          earnings[comp.name] = comp.amount;
          masterGross += comp.amount;
          if (comp.name.toLowerCase().includes("basic") || !masterBasic) {
            masterBasic += comp.amount;
          }
        }
      }
      if (!masterBasic) masterBasic = Math.round(masterGross * 0.5);
    } else {
      // Standard baseline package based on designation / role
      const e = emp as any;
      const isManager = (e.role || "").includes("manager") || (e.role || "").includes("admin");
      masterBasic = isManager ? 85000 : 55000;
      const hra = Math.round(masterBasic * 0.4);
      const specialAllowance = isManager ? 25000 : 15000;

      earnings = {
        "Basic Salary": masterBasic,
        "House Rent Allowance (HRA)": hra,
        "Special Allowance": specialAllowance,
      };
      masterGross = masterBasic + hra + specialAllowance;
    }

    // Attendance & Loss of Pay (LOP) Proration
    let lopDays = 0;
    try {
      const attendanceRecords = await attendanceService.findManyInTenant(tenantId, {
        where: [{ field: "userId", op: "==", value: emp.id }],
      });
      const periodAttendance = attendanceRecords.filter((a) => {
        const d = (a as any).date;
        return d && typeof d === "string" && d >= startStr && d <= endStr;
      });
      lopDays = periodAttendance.filter((a) => (a as any).status === "absent").length;
    } catch {
      lopDays = 0;
    }

    const earned = calculateEarnedSalary({
      masterBasic,
      masterGross,
      totalDaysInMonth: totalDaysInPeriod,
      lopDays,
    });
    const proration = earned.prorationFactor;

    // Prorate earnings based on actual attendance
    const earnedEarnings: Record<string, number> = {};
    for (const [name, amt] of Object.entries(earnings)) {
      if (name.toLowerCase().includes("basic")) {
        earnedEarnings[name] = earned.earnedBasic;
      } else {
        earnedEarnings[name] = Math.round(amt * proration);
      }
    }
    const grossPay = Object.values(earnedEarnings).reduce((s, a) => s + a, 0);

    // Statutory Calculations
    const pfResult = calculatePF(earned.earnedBasic, statutoryConfig);
    const esiResult = calculateESI(grossPay, statutoryConfig);
    const pt = calculatePT(grossPay, (emp as any).state || "Karnataka");
    const taxMonthly = Math.round(calculateNewRegimeTax(grossPay * 12).annualTax / 12);

    if (pfResult.employeePF > 0) {
      deductions["Provident Fund (PF)"] = pfResult.employeePF;
    }
    if (esiResult.isEligible && esiResult.employeeESI > 0) {
      deductions["Employee State Insurance (ESIC)"] = esiResult.employeeESI;
    }
    if (pt > 0) {
      deductions["Professional Tax"] = pt;
    }
    if (taxMonthly > 0) {
      deductions["Income Tax (TDS)"] = taxMonthly;
    }

    // Salary Advance Recoveries
    try {
      const advances = await salaryAdvancesService.findManyInTenant(tenantId, {
        where: [{ field: "userId", op: "==", value: emp.id }],
      });
      let advanceRecovery = 0;
      for (const adv of advances) {
        if ((adv.status === "approved" || adv.status === "disbursed") && !(adv as any).recovered) {
          const advAmt = Number(adv.requestedAmount || (adv as any).amount || 0);
          if (advAmt > 0) {
            advanceRecovery += advAmt;
            await salaryAdvancesService.update(adv.id, {
              status: "deducted",
              recovered: true,
              deductedPayrollMonth: periodStart.toISOString().slice(0, 7),
              recoveredInPayrollRunId: payrollRun.id,
              recoveredAt: new Date(),
            } as any);
          }
        }
      }
      if (advanceRecovery > 0) {
        deductions["Salary Advance Deduction"] = advanceRecovery;
      }
    } catch {
      // Fall through if advances service unavailable
    }

    const totalDeduct = Object.values(deductions).reduce((s, a) => s + a, 0);
    const netPay = Math.max(0, grossPay - totalDeduct);
    totalGrossPay += grossPay;
    totalDeductions += totalDeduct;
    totalNetPay += netPay;

    const e = emp as any;
    await payrollTransactionsService.create({
      payrollRunId: payrollRun.id,
      userId: emp.id,
      userName: e.displayName || e.name || e.email,
      userEmail: emp.email,
      employeeCode: e.employeeCode || "",
      department: e.department || e.departmentName || "General",
      designation: e.designation || e.designationName || "Staff",
      periodStart,
      periodEnd,
      grossPay,
      totalDeductions: totalDeduct,
      netPay,
      earnings: earnedEarnings,
      deductions,
      status: "completed",
      tenantId,
    } as any);
  }

  // 5. Update payroll run totals
  await payrollRunsService.update(payrollRun.id, {
    totalEmployees: employees.length,
    totalGross: totalGrossPay,
    totalGrossPay,
    totalDeductions,
    totalNet: totalNetPay,
    totalNetPay,
    status: "completed",
  } as any);

  return (await payrollRunsService.findById(payrollRun.id))!;
}

// ── Payroll Transactions ───────────────────────────────

export async function getPayrollTransactions(
  payrollRunId: string
): Promise<PayrollTransaction[]> {
  return payrollTransactionsService.findMany({
    where: [{ field: "payrollRunId", op: "==", value: payrollRunId }],
  });
}

export async function getEmployeePayrollTransactions(
  tenantId: string,
  userId: string
): Promise<PayrollTransaction[]> {
  return payrollTransactionsService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function markPayrollTransactionPaid(id: string): Promise<PayrollTransaction | null> {
  return payrollTransactionsService.update(id, {
    status: "paid",
    paidAt: new Date(),
  } as any);
}

// ── Payslip Templates ──────────────────────────────────

export async function getPayslipTemplates(tenantId: string): Promise<PayslipTemplate[]> {
  return payslipTemplatesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createPayslipTemplate(tenantId: string, data: Partial<PayslipTemplate>): Promise<PayslipTemplate> {
  return payslipTemplatesService.create({ ...data, tenantId } as any);
}

export async function updatePayslipTemplate(id: string, data: Partial<PayslipTemplate>): Promise<PayslipTemplate | null> {
  return payslipTemplatesService.update(id, data as any);
}

// ── Dashboard ──────────────────────────────────────────

export async function getPayrollDashboard(tenantId: string): Promise<{
  totalPayGroups: number;
  activeComponents: number;
  totalEmployees: number;
  lastPayrollDate: Date | null;
}> {
  const [payGroups, components, lastRun] = await Promise.all([
    getPayGroups(tenantId),
    getSalaryComponents(tenantId),
    getPayrollRuns(tenantId).then((runs) => runs[0] || null),
  ]);

  return {
    totalPayGroups: payGroups.length,
    activeComponents: components.filter((c) => c.status === "active").length,
    totalEmployees: 0,
    lastPayrollDate: lastRun?.processedAt || null,
  };
}

export async function updatePayrollRun(id: string, data: Partial<PayrollRun>): Promise<PayrollRun | null> {
  const doc = await payrollRunsService.findById(id);
  if (!doc) return null;
  const updateData = { ...data, updatedAt: new Date() };
  await payrollRunsService.update(id, updateData as any);
  return { ...doc, ...updateData, id } as PayrollRun;
}

export async function deletePayrollRun(id: string): Promise<boolean> {
  return payrollRunsService.delete(id);
}
