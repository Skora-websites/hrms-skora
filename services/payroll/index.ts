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
} from "@/lib/hrm/firestore";
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
  const payGroup = await payGroupsService.findById(payGroupId);
  if (!payGroup) throw new Error("Pay group not found");

  const allSalaries = await employeeSalariesService.findManyInTenant(tenantId, {
    where: [
      { field: "status", op: "==", value: "active" },
      { field: "payGroupId", op: "==", value: payGroupId },
    ],
  });

  let totalGrossPay = 0;
  let totalDeductions = 0;
  let totalNetPay = 0;

  const payrollRun = await payrollRunsService.create({
    payGroupId,
    periodStart,
    periodEnd,
    processedBy,
    processedAt: new Date(),
    totalEmployees: allSalaries.length,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    status: "processing",
    tenantId,
  } as any);

  // Process each employee
  for (const salary of allSalaries) {
    const earnings: Record<string, number> = {};
    const deductions: Record<string, number> = {};
    let grossPay = 0;
    let totalDeduct = 0;

    for (const comp of salary.components) {
      if (comp.type === "earning") {
        earnings[comp.name] = comp.amount;
        grossPay += comp.amount;
      } else {
        deductions[comp.name] = comp.amount;
        totalDeduct += comp.amount;
      }
    }

    const netPay = grossPay - totalDeduct;
    totalGrossPay += grossPay;
    totalDeductions += totalDeduct;
    totalNetPay += netPay;

    await payrollTransactionsService.create({
      payrollRunId: payrollRun.id,
      userId: salary.userId,
      grossPay,
      totalDeductions: totalDeduct,
      netPay,
      earnings,
      deductions,
      status: "pending",
      tenantId,
    } as any);
  }

  // Update payroll run totals
  await payrollRunsService.update(payrollRun.id, {
    totalGrossPay,
    totalDeductions,
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
