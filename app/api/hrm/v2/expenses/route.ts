import { NextRequest, NextResponse } from "next/server";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  deleteExpense,
} from "@/services/hrm/expenses";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { hrmUsersService } from "@/lib/hrm/firestore";

const isHrRole = (role: string) =>
  role === "super_admin" || role === "hr_admin" || role === "admin";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const stats = searchParams.get("stats") === "true";
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const department = searchParams.get("department") || undefined;
  const month = searchParams.get("month") || undefined;
  const search = searchParams.get("search") || undefined;

  // Single expense
  if (id) {
    const expense = await getExpenseById(id);
    if (!expense) return notFound("Expense claim not found");

    // IDOR protection
    if (!isHrRole(auth.role) && expense.userId !== auth.userId) {
      return forbidden("You can only view your own expense claims");
    }

    return NextResponse.json({ success: true, data: expense });
  }

  // Scoping: HR sees all or filtered; Employee only sees own
  const targetUserId = isHrRole(auth.role)
    ? searchParams.get("userId") || undefined
    : auth.userId;

  const list = await getExpenses(tenantId, {
    userId: targetUserId,
    department,
    status,
    category,
    month,
    search,
  });

  if (stats) {
    const totalCount = list.length;
    const pendingCount = list.filter((e) => e.status === "pending").length;
    const approvedCount = list.filter((e) => e.status === "approved").length;
    const rejectedCount = list.filter((e) => e.status === "rejected").length;
    const reimbursedCount = list.filter((e) => e.status === "reimbursed").length;

    const totalClaimed = list.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalApproved = list
      .filter((e) => e.status === "approved" || e.status === "reimbursed")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalReimbursed = list
      .filter((e) => e.status === "reimbursed")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalPending = list
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        pendingCount,
        approvedCount,
        rejectedCount,
        reimbursedCount,
        totalClaimed,
        totalApproved,
        totalReimbursed,
        totalPending,
      },
    });
  }

  return NextResponse.json({ success: true, data: list, count: list.length });
});

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const {
    category,
    amount,
    currency,
    expenseDate,
    merchant,
    description,
    receiptUrl,
    receiptName,
    department,
    userId,
    employeeName,
    employeeEmail,
  } = body;

  if (!category || !category.trim()) {
    return badRequest("Category is required");
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return badRequest("Amount must be a positive number");
  }

  if (!expenseDate) {
    return badRequest("Expense date is required");
  }

  // Target user: HR can file on behalf of someone; employees always file for self
  const targetUserId = isHrRole(auth.role) && userId ? userId : auth.userId;
  const targetUser = await hrmUsersService.findById(targetUserId);
  const targetUserName =
    isHrRole(auth.role) && employeeName ? employeeName : targetUser?.displayName || targetUser?.email || "Employee";
  const targetEmail =
    isHrRole(auth.role) && employeeEmail ? employeeEmail : targetUser?.email || "";
  const targetDept = department || (targetUser as any)?.department || "General";

  const created = await createExpense(tenantId, {
    userId: targetUserId,
    employeeName: targetUserName,
    employeeEmail: targetEmail,
    department: targetDept,
    category: category.trim(),
    amount: numAmount,
    currency: currency || "INR",
    expenseDate,
    merchant: merchant?.trim(),
    description: description?.trim(),
    receiptUrl: receiptUrl?.trim(),
    receiptName: receiptName?.trim(),
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
});

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { id, action, rejectionReason, payrollRunId } = body;
  if (!id) return badRequest("Expense ID is required");
  if (!action) return badRequest("Action is required ('approve', 'reject', 'reimburse')");

  const expense = await getExpenseById(id);
  if (!expense) return notFound("Expense claim not found");

  // Approval actions require HR/Admin permissions
  if (!isHrRole(auth.role)) {
    return forbidden("Only HR and Admin can approve, reject, or reimburse expense claims");
  }

  const approver = await hrmUsersService.findById(auth.userId);
  const approverName = approver?.displayName || approver?.email || "HR Admin";

  if (action === "approve") {
    if (expense.status !== "pending") {
      return badRequest(`Cannot approve an expense with status '${expense.status}'`);
    }
    const updated = await approveExpense(id, auth.userId, approverName);
    return NextResponse.json({ success: true, data: updated, message: "Expense approved successfully" });
  }

  if (action === "reject") {
    if (expense.status !== "pending") {
      return badRequest(`Cannot reject an expense with status '${expense.status}'`);
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      return badRequest("Rejection reason is required");
    }
    const updated = await rejectExpense(id, auth.userId, approverName, rejectionReason.trim());
    return NextResponse.json({ success: true, data: updated, message: "Expense rejected" });
  }

  if (action === "reimburse") {
    if (expense.status !== "approved") {
      return badRequest("Only approved expenses can be marked as reimbursed");
    }
    const updated = await reimburseExpense(id, payrollRunId);
    return NextResponse.json({ success: true, data: updated, message: "Expense marked as reimbursed" });
  }

  return badRequest(`Unsupported action '${action}'`);
});

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("Expense ID is required");

  const expense = await getExpenseById(id);
  if (!expense) return notFound("Expense claim not found");

  if (!isHrRole(auth.role)) {
    if (expense.userId !== auth.userId) {
      return forbidden("You can only delete your own expense claims");
    }
    if (expense.status !== "pending") {
      return badRequest("Cannot delete an expense claim that has already been approved or processed");
    }
  }

  await deleteExpense(id);
  return NextResponse.json({ success: true, message: "Expense claim deleted successfully" });
});
