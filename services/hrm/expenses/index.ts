import "server-only";
import { expensesService, expenseCategoriesService } from "@/lib/hrm/firestore";
import type { Expense, ExpenseCategory } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Expenses & Reimbursements Service
// ══════════════════════════════════════════════════════════════════

export async function getExpenses(
  tenantId: string,
  options: {
    userId?: string;
    department?: string;
    status?: string;
    category?: string;
    month?: string; // YYYY-MM
    search?: string;
  } = {}
): Promise<Expense[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.userId) {
    where.push({ field: "userId", op: "==", value: options.userId });
  }
  if (options.status) {
    where.push({ field: "status", op: "==", value: options.status });
  }
  if (options.category) {
    where.push({ field: "category", op: "==", value: options.category });
  }

  let list = await expensesService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  if (options.department) {
    const deptLower = options.department.toLowerCase();
    list = list.filter((e) => e.department?.toLowerCase() === deptLower);
  }

  if (options.month) {
    list = list.filter((e) => e.expenseDate && e.expenseDate.startsWith(options.month!));
  }

  if (options.search) {
    const s = options.search.toLowerCase();
    list = list.filter(
      (e) =>
        e.employeeName?.toLowerCase().includes(s) ||
        e.employeeEmail?.toLowerCase().includes(s) ||
        e.merchant?.toLowerCase().includes(s) ||
        e.description?.toLowerCase().includes(s) ||
        e.category?.toLowerCase().includes(s)
    );
  }

  return list;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  return expensesService.findById(id);
}

export async function createExpense(
  tenantId: string,
  data: {
    userId: string;
    employeeName: string;
    employeeEmail: string;
    department?: string;
    category: string;
    amount: number;
    currency?: string;
    expenseDate: string;
    merchant?: string;
    description?: string;
    receiptUrl?: string;
    receiptName?: string;
  }
): Promise<Expense> {
  const now = new Date();
  const expense: Omit<Expense, "id"> = {
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    category: data.category,
    amount: Number(data.amount),
    currency: data.currency || "INR",
    expenseDate: data.expenseDate,
    merchant: data.merchant || "",
    description: data.description || "",
    receiptUrl: data.receiptUrl || "",
    receiptName: data.receiptName || "",
    status: "pending",
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    reimbursedAt: null,
    payrollRunId: undefined,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return expensesService.create({
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    category: data.category,
    amount: Number(data.amount),
    currency: data.currency || "INR",
    expenseDate: data.expenseDate,
    merchant: data.merchant || "",
    description: data.description || "",
    receiptUrl: data.receiptUrl || "",
    receiptName: data.receiptName || "",
    status: "pending",
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    reimbursedAt: null,
    payrollRunId: undefined,
  } as any);
}

export async function approveExpense(
  id: string,
  approverId: string,
  approverName: string
): Promise<Expense | null> {
  const existing = await expensesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await expensesService.update(id, {
    status: "approved",
    approvedBy: approverId,
    approvedByName: approverName,
    approvedAt: now,
    rejectionReason: undefined,
    updatedAt: now,
  });

  return expensesService.findById(id);
}

export async function rejectExpense(
  id: string,
  approverId: string,
  approverName: string,
  reason: string
): Promise<Expense | null> {
  const existing = await expensesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await expensesService.update(id, {
    status: "rejected",
    approvedBy: approverId,
    approvedByName: approverName,
    rejectionReason: reason,
    updatedAt: now,
  });

  return expensesService.findById(id);
}

export async function reimburseExpense(
  id: string,
  payrollRunId?: string
): Promise<Expense | null> {
  const existing = await expensesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await expensesService.update(id, {
    status: "reimbursed",
    reimbursedAt: now,
    payrollRunId: payrollRunId || undefined,
    updatedAt: now,
  });

  return expensesService.findById(id);
}

export async function deleteExpense(id: string): Promise<boolean> {
  return expensesService.delete(id);
}

// ── Categories ─────────────────────────────────────────

export async function getExpenseCategories(tenantId: string): Promise<ExpenseCategory[]> {
  return expenseCategoriesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function createExpenseCategory(
  tenantId: string,
  data: {
    name: string;
    code: string;
    monthlyCap?: number;
    requiresReceipt?: boolean;
    description?: string;
  }
): Promise<ExpenseCategory> {
  const now = new Date();
  const category: Omit<ExpenseCategory, "id"> = {
    tenantId,
    name: data.name,
    code: data.code.toUpperCase().replace(/\s+/g, "_"),
    monthlyCap: Number(data.monthlyCap || 0),
    requiresReceipt: data.requiresReceipt !== undefined ? Boolean(data.requiresReceipt) : true,
    description: data.description || "",
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return expenseCategoriesService.create({
    tenantId,
    name: data.name,
    code: data.code.toUpperCase().replace(/\s+/g, "_"),
    monthlyCap: Number(data.monthlyCap || 0),
    requiresReceipt: data.requiresReceipt !== undefined ? Boolean(data.requiresReceipt) : true,
    description: data.description || "",
    status: "active",
  } as any);
}
