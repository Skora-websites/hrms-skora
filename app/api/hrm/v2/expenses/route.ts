import { NextRequest, NextResponse } from "next/server";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  managerApproveExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  deleteExpense,
  checkCategoryCap,
} from "@/services/hrm/expenses";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { hrmUsersService } from "@/lib/hrm/firestore";

const isHrRole = (role: string) =>
  role === "super_admin" || role === "hr_admin" || role === "admin";

/** Helper: verify manager relationship */
async function isManagerOfEmployee(managerId: string, employeeId: string): Promise<boolean> {
  if (managerId === employeeId) return true;
  try {
    const employee = await hrmUsersService.findById(employeeId);
    if (!employee) return false;
    const rm = (employee as any)?.reportingManager || (employee as any)?.reportingManagerId;
    if (!rm) return false;
    if (rm === managerId) return true;
    const manager = await hrmUsersService.findById(managerId);
    return !!manager && (rm === manager.displayName || rm === manager.email || rm === manager.id);
  } catch {
    return false;
  }
}

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const stats = searchParams.get("stats") === "true";
  const checkCap = searchParams.get("checkCap") === "true";
  const scope = searchParams.get("scope"); // "team" | "my"
  const status = searchParams.get("status") || undefined;
  const category = searchParams.get("category") || undefined;
  const department = searchParams.get("department") || undefined;
  const month = searchParams.get("month") || undefined;
  const search = searchParams.get("search") || undefined;

  // Real-time category cap check query for submission modals
  if (checkCap) {
    const cat = searchParams.get("category");
    if (!cat) return badRequest("Category is required for cap check");
    const amt = Number(searchParams.get("amount") || 0);
    const m = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const targetUser = isHrRole(auth.role) && searchParams.get("userId") ? searchParams.get("userId")! : auth.userId;
    const capInfo = await checkCategoryCap(tenantId, targetUser, cat, m, amt);
    return NextResponse.json({ success: true, data: capInfo });
  }

  // Single expense
  if (id) {
    const expense = await getExpenseById(id);
    if (!expense) return notFound("Expense claim not found");

    // IDOR protection: HR can see all; manager can see direct reports; employee only self
    if (!isHrRole(auth.role)) {
      if (auth.role === "manager") {
        const canView = expense.userId === auth.userId || (await isManagerOfEmployee(auth.userId, expense.userId));
        if (!canView) return forbidden("You do not have permission to view this expense claim");
      } else if (expense.userId !== auth.userId) {
        return forbidden("You can only view your own expense claims");
      }
    }

    return NextResponse.json({ success: true, data: expense });
  }

  // Scoping:
  // - HR/Admin sees all (or filtered by userId)
  // - Manager with scope="team": sees direct reports' claims
  // - Otherwise: user sees only own claims
  let targetUserId: string | undefined = undefined;
  let isTeamView = false;

  if (isHrRole(auth.role)) {
    targetUserId = searchParams.get("userId") || undefined;
  } else if (auth.role === "manager" && scope === "team") {
    isTeamView = true;
  } else {
    targetUserId = auth.userId;
  }

  let list = await getExpenses(tenantId, {
    userId: targetUserId,
    department,
    status,
    category,
    month,
    search,
  });

  if (isTeamView) {
    // Keep only direct reports' claims
    const filtered: typeof list = [];
    for (const e of list) {
      if (e.userId !== auth.userId && (await isManagerOfEmployee(auth.userId, e.userId))) {
        filtered.push(e);
      }
    }
    list = filtered;
  }

  if (stats) {
    const totalCount = list.length;
    const pendingManagerCount = list.filter((e) => e.status === "pending_manager" || e.status === "pending").length;
    const managerApprovedCount = list.filter((e) => e.status === "manager_approved").length;
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
      .filter((e) => e.status === "pending" || e.status === "pending_manager" || e.status === "manager_approved")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        pendingCount: pendingManagerCount + managerApprovedCount,
        pendingManagerCount,
        managerApprovedCount,
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

  if (!receiptUrl || !receiptUrl.trim()) {
    return badRequest("Receipt attachment is mandatory for reimbursement claims");
  }

  // Target user: HR can file on behalf of someone; employees file for self
  const targetUserId = isHrRole(auth.role) && userId ? userId : auth.userId;
  const targetUser = await hrmUsersService.findById(targetUserId);
  const targetUserName =
    isHrRole(auth.role) && employeeName ? employeeName : targetUser?.displayName || targetUser?.email || "Employee";
  const targetEmail =
    isHrRole(auth.role) && employeeEmail ? employeeEmail : targetUser?.email || "";
  const targetDept = department || (targetUser as any)?.department || "General";

  const expense = await createExpense(tenantId, {
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

  const capWarning = expense.capWarning;

  return NextResponse.json(
    {
      success: true,
      data: expense,
      capWarning,
      message: capWarning
        ? `Expense claim submitted. Warning: ${capWarning}`
        : "Expense claim submitted successfully for manager review.",
    },
    { status: 201 }
  );
});

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const {
    id,
    action,
    rejectionReason,
    payrollRunId,
    payoutMethod,
    paymentReference,
    paymentMode,
  } = body;

  if (!id) return badRequest("Expense ID is required");
  if (!action) return badRequest("Action is required ('manager_approve', 'approve', 'reject', 'reimburse')");

  const expense = await getExpenseById(id);
  if (!expense) return notFound("Expense claim not found");

  const approver = await hrmUsersService.findById(auth.userId);
  const approverName = approver?.displayName || approver?.email || "Reviewer";

  // 1. Manager Approval Step
  if (action === "manager_approve") {
    if (expense.status !== "pending_manager" && expense.status !== "pending") {
      return badRequest(`Cannot manager-approve an expense with status '${expense.status}'`);
    }

    // Role check: must be manager of the employee OR HR/Superadmin
    if (!isHrRole(auth.role)) {
      if (auth.role !== "manager" || !(await isManagerOfEmployee(auth.userId, expense.userId))) {
        return forbidden("Only the reporting manager can approve this step");
      }
    }

    const updated = await managerApproveExpense(id, auth.userId, approverName);
    return NextResponse.json({
      success: true,
      data: updated,
      message: "Expense endorsed by manager and forwarded to HR desk",
    });
  }

  // 2. HR Final Approval (or HR Override)
  if (action === "approve" || action === "hr_approve") {
    if (!isHrRole(auth.role)) {
      return forbidden("Only HR and Admin can grant final reimbursement approval");
    }

    const isOverride = expense.status === "pending_manager" || expense.status === "pending";
    if (expense.status !== "manager_approved" && !isOverride) {
      return badRequest(`Cannot approve an expense with status '${expense.status}'`);
    }

    const updated = await approveExpense(id, auth.userId, approverName, isOverride);
    return NextResponse.json({
      success: true,
      data: updated,
      message: isOverride
        ? "Expense approved via HR override and queued for reimbursement"
        : "Expense approved successfully and queued for reimbursement",
    });
  }

  // 3. Rejection (Manager or HR)
  if (action === "reject") {
    if (expense.status !== "pending_manager" && expense.status !== "pending" && expense.status !== "manager_approved") {
      return badRequest(`Cannot reject an expense with status '${expense.status}'`);
    }

    if (!isHrRole(auth.role)) {
      if (auth.role !== "manager" || !(await isManagerOfEmployee(auth.userId, expense.userId))) {
        return forbidden("You do not have permission to reject this claim");
      }
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return badRequest("Rejection reason is required");
    }

    const updated = await rejectExpense(
      id,
      auth.userId,
      approverName,
      rejectionReason.trim(),
      isHrRole(auth.role) ? "HR Admin" : "Reporting Manager"
    );
    return NextResponse.json({ success: true, data: updated, message: "Expense claim rejected" });
  }

  // 4. Reimbursement Settlement (Payroll or Direct Transfer)
  if (action === "reimburse") {
    if (!isHrRole(auth.role)) {
      return forbidden("Only HR and Admin can mark expense claims as reimbursed");
    }

    if (expense.status !== "approved") {
      return badRequest("Only approved expenses can be marked as reimbursed");
    }

    const updated = await reimburseExpense(id, {
      payoutMethod: payoutMethod || (payrollRunId ? "payroll" : "direct_transfer"),
      payrollRunId,
      paymentReference,
      paymentMode,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Expense marked as reimbursed successfully",
    });
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
    if (expense.status !== "pending" && expense.status !== "pending_manager") {
      return badRequest("Cannot delete an expense claim that has already been approved or processed");
    }
  }

  await deleteExpense(id);
  return NextResponse.json({ success: true, message: "Expense claim deleted successfully" });
});
