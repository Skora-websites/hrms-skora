import "server-only";
import { expensesService, expenseCategoriesService, hrmUsersService } from "@/lib/hrm/firestore";
import { sendNotification } from "@/services/notifications";
import type { Expense, ExpenseCategory } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Expenses & Reimbursements Service (2-Step Approval & Caps)
// ══════════════════════════════════════════════════════════════════

export async function getExpenses(
  tenantId: string,
  options: {
    userId?: string;
    managerId?: string;
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
  if (options.category) {
    where.push({ field: "category", op: "==", value: options.category });
  }

  let list = await expensesService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  // Filter by status (handle "pending" matching both "pending" and "pending_manager")
  if (options.status) {
    if (options.status === "pending") {
      list = list.filter(
        (e) => e.status === "pending" || e.status === "pending_manager"
      );
    } else {
      list = list.filter((e) => e.status === options.status);
    }
  }

  // Filter by manager (direct reports)
  if (options.managerId) {
    list = list.filter((e) => e.managerId === options.managerId);
  }

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

/** Check monthly spending cap for a specific category */
export async function checkCategoryCap(
  tenantId: string,
  userId: string,
  categoryCodeOrName: string,
  month: string, // YYYY-MM
  additionalAmount: number = 0
): Promise<{
  monthlyCap: number;
  currentTotal: number;
  projectedTotal: number;
  isExceeded: boolean;
  excessAmount: number;
  requiresReceipt: boolean;
}> {
  const categories = await getExpenseCategories(tenantId);
  const matched = categories.find(
    (c) =>
      c.code?.toUpperCase() === categoryCodeOrName.toUpperCase() ||
      c.name?.toLowerCase() === categoryCodeOrName.toLowerCase() ||
      c.name?.toLowerCase().includes(categoryCodeOrName.toLowerCase()) ||
      categoryCodeOrName.toLowerCase().includes(c.name?.toLowerCase() || "")
  );

  const monthlyCap = Number(matched?.monthlyCap || 0);
  const requiresReceipt = matched?.requiresReceipt ?? true;

  if (!monthlyCap || monthlyCap <= 0) {
    return {
      monthlyCap: 0,
      currentTotal: 0,
      projectedTotal: Number(additionalAmount),
      isExceeded: false,
      excessAmount: 0,
      requiresReceipt,
    };
  }

  // Calculate user's approved and pending claims in this category for this month
  const userExpenses = await getExpenses(tenantId, {
    userId,
    month,
  });

  const matchingMonthExpenses = userExpenses.filter(
    (e) =>
      (e.category.toUpperCase() === categoryCodeOrName.toUpperCase() ||
        e.category.toLowerCase() === matched?.name.toLowerCase()) &&
      e.status !== "rejected"
  );

  const currentTotal = matchingMonthExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  const projectedTotal = currentTotal + Number(additionalAmount);
  const isExceeded = projectedTotal > monthlyCap;
  const excessAmount = isExceeded ? projectedTotal - monthlyCap : 0;

  return {
    monthlyCap,
    currentTotal,
    projectedTotal,
    isExceeded,
    excessAmount,
    requiresReceipt,
  };
}

export async function createExpense(
  tenantId: string,
  data: {
    userId: string;
    employeeName: string;
    employeeEmail: string;
    department?: string;
    managerId?: string;
    managerName?: string;
    category: string;
    amount: number;
    currency?: string;
    expenseDate: string;
    merchant?: string;
    description?: string;
    receiptUrl?: string;
    receiptName?: string;
  }
): Promise<Expense & { capWarning?: string }> {
  const now = new Date();
  const numAmount = Number(data.amount);

  // Auto-resolve reporting manager if not provided
  let managerId = data.managerId;
  let managerName = data.managerName;

  if (!managerId) {
    try {
      const user = await hrmUsersService.findById(data.userId);
      const rm = (user as any)?.reportingManager || (user as any)?.reportingManagerId;
      if (rm) {
        const managerDoc = await hrmUsersService.findById(rm);
        if (managerDoc) {
          managerId = managerDoc.id;
          managerName = managerDoc.displayName || managerDoc.email;
        } else {
          const allUsers = await hrmUsersService.findManyInTenant(tenantId);
          const found = allUsers.find(
            (u) => u.displayName === rm || u.email === rm || u.id === rm
          );
          if (found) {
            managerId = found.id;
            managerName = found.displayName || found.email;
          }
        }
      }
    } catch {
      // ignore lookup error
    }
  }

  // Check category cap for month
  const month = data.expenseDate ? data.expenseDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const capCheck = await checkCategoryCap(tenantId, data.userId, data.category, month, numAmount);

  let capWarning: string | undefined = undefined;
  if (capCheck.isExceeded) {
    capWarning = `Claim exceeds monthly cap of ₹${capCheck.monthlyCap.toLocaleString()} by ₹${capCheck.excessAmount.toLocaleString()}`;
  }

  const initialStatus = "pending";

  const expense = await expensesService.create({
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    managerId: managerId || undefined,
    managerName: managerName || undefined,
    category: data.category,
    amount: numAmount,
    currency: data.currency || "INR",
    expenseDate: data.expenseDate,
    merchant: data.merchant || "",
    description: data.description || "",
    receiptUrl: data.receiptUrl || "",
    receiptName: data.receiptName || "",
    status: initialStatus,
    managerApprovedBy: undefined,
    managerApprovedByName: undefined,
    managerApprovedAt: null,
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    reimbursedAt: null,
    payrollRunId: undefined,
    paymentReference: undefined,
    paymentMode: undefined,
    createdAt: now,
    updatedAt: now,
  } as any);

  // Notify manager if assigned
  if (managerId) {
    try {
      await sendNotification({
        tenantId,
        userId: managerId,
        title: "New Expense Claim for Review",
        body: `${data.employeeName} submitted an expense claim of ₹${numAmount.toLocaleString()} for ${data.category}`,
        type: "payroll",
        referenceId: expense.id,
        referenceType: "expense",
      });
    } catch (err) {
      console.warn("Failed to send expense notification to manager:", err);
    }
  }

  return Object.assign(expense, { capWarning });
}

/** Step 1: Manager Review / Approval */
export async function managerApproveExpense(
  id: string,
  managerId: string,
  managerName: string
): Promise<Expense | null> {
  const existing = await expensesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await expensesService.update(id, {
    status: "manager_approved",
    managerApprovedBy: managerId,
    managerApprovedByName: managerName,
    managerApprovedAt: now,
    rejectionReason: undefined,
    updatedAt: now,
  });

  // Notify employee
  try {
    await sendNotification({
      tenantId: existing.tenantId,
      userId: existing.userId,
      title: "Expense Claim Endorsed by Manager",
      body: `Your claim of ₹${Number(existing.amount).toLocaleString()} (${existing.category}) was approved by ${managerName} and routed to HR for disbursement.`,
      type: "payroll",
      referenceId: id,
      referenceType: "expense",
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }

  return expensesService.findById(id);
}

/** Step 2: HR / Admin Final Approval (or HR override) */
export async function approveExpense(
  id: string,
  approverId: string,
  approverName: string,
  isOverride: boolean = false
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

  // Notify employee
  try {
    await sendNotification({
      tenantId: existing.tenantId,
      userId: existing.userId,
      title: "Expense Claim Approved",
      body: `Your expense claim of ₹${Number(existing.amount).toLocaleString()} (${existing.category}) has been officially approved by HR and is queued for reimbursement.${isOverride ? " (Approved via HR Admin override)" : ""}`,
      type: "payroll",
      referenceId: id,
      referenceType: "expense",
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }

  return expensesService.findById(id);
}

export async function rejectExpense(
  id: string,
  approverId: string,
  approverName: string,
  reason: string,
  role: string = "reviewer"
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

  // Notify employee
  try {
    await sendNotification({
      tenantId: existing.tenantId,
      userId: existing.userId,
      title: "Expense Claim Rejected",
      body: `Your expense claim of ₹${Number(existing.amount).toLocaleString()} (${existing.category}) was rejected by ${approverName} (${role}). Reason: ${reason}`,
      type: "payroll",
      referenceId: id,
      referenceType: "expense",
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }

  return expensesService.findById(id);
}

/** Step 3: Reimbursement settlement (Hybrid: Payroll run or Direct Bank Transfer) */
export async function reimburseExpense(
  id: string,
  optionsOrPayrollRunId?:
    | string
    | {
        payrollRunId?: string;
        payoutMethod?: "payroll" | "direct_transfer";
        paymentReference?: string;
        paymentMode?: string;
      }
): Promise<Expense | null> {
  const existing = await expensesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  const options =
    typeof optionsOrPayrollRunId === "string"
      ? { payrollRunId: optionsOrPayrollRunId, payoutMethod: "payroll" as const }
      : optionsOrPayrollRunId || {};

  const payoutMethod =
    options.payoutMethod || (options.payrollRunId ? "payroll" : "direct_transfer");

  await expensesService.update(id, {
    status: "reimbursed",
    reimbursedAt: now,
    payoutMethod,
    payrollRunId: options.payrollRunId || undefined,
    paymentReference: options.paymentReference || undefined,
    paymentMode: options.paymentMode || (options.payrollRunId ? "Monthly Payslip" : "Bank Transfer"),
    updatedAt: now,
  });

  // Notify employee
  try {
    const payoutDesc =
      payoutMethod === "payroll"
        ? "processed and added to your monthly payroll payslip"
        : `disbursed directly (${options.paymentReference ? `Ref: ${options.paymentReference}` : "Bank Transfer"})`;

    await sendNotification({
      tenantId: existing.tenantId,
      userId: existing.userId,
      title: "Expense Claim Reimbursed",
      body: `Your reimbursement of ₹${Number(existing.amount).toLocaleString()} has been ${payoutDesc}.`,
      type: "payroll",
      referenceId: id,
      referenceType: "expense",
    });
  } catch (err) {
    console.warn("Notification error:", err);
  }

  return expensesService.findById(id);
}

export async function deleteExpense(id: string): Promise<boolean> {
  return expensesService.delete(id);
}

// ── Categories ─────────────────────────────────────────

export async function getExpenseCategories(tenantId: string): Promise<ExpenseCategory[]> {
  let categories = await expenseCategoriesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });

  if (categories.length === 0) {
    // Seed default categories if empty
    const defaults = [
      { name: "Broadband & Internet", code: "INTERNET", monthlyCap: 1500, requiresReceipt: true, description: "Monthly home/office Wi-Fi and mobile bills" },
      { name: "Team & Client Meals", code: "MEALS", monthlyCap: 3000, requiresReceipt: true, description: "Client lunch/dinner and team refreshments" },
      { name: "Local Conveyance & Fuel", code: "FUEL", monthlyCap: 4000, requiresReceipt: true, description: "Fuel, cab, and auto fares for business travel" },
      { name: "Office Supplies & Hardware", code: "SUPPLIES", monthlyCap: 2500, requiresReceipt: true, description: "Stationery, cables, peripherals, and small equipment" },
      { name: "Software & Subscriptions", code: "SOFTWARE", monthlyCap: 5000, requiresReceipt: true, description: "Tools and services required for work duties" },
    ];

    for (const d of defaults) {
      try {
        await createExpenseCategory(tenantId, d);
      } catch {
        // ignore conflict
      }
    }

    categories = await expenseCategoriesService.findManyInTenant(tenantId, {
      orderByField: "name",
      orderByDirection: "asc",
    });
  }

  return categories.map((c) => ({
    ...c,
    requiresReceipt: Boolean(c.requiresReceipt),
    monthlyCap: Number(c.monthlyCap || 0),
  }));
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
  return expenseCategoriesService.create({
    tenantId,
    name: data.name,
    code: data.code.toUpperCase().replace(/\s+/g, "_"),
    monthlyCap: Number(data.monthlyCap || 0),
    requiresReceipt: data.requiresReceipt !== undefined ? Boolean(data.requiresReceipt) : true,
    description: data.description || "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  } as any);
}

export async function updateExpenseCategory(
  id: string,
  data: Partial<Omit<ExpenseCategory, "id" | "tenantId">>
): Promise<ExpenseCategory | null> {
  const existing = await expenseCategoriesService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await expenseCategoriesService.update(id, {
    ...data,
    updatedAt: now,
  });

  return expenseCategoriesService.findById(id);
}
