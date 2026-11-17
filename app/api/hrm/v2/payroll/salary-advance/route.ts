import { NextRequest, NextResponse } from "next/server";
import {
  calculateAccruedWage,
  getSalaryAdvances,
  getSalaryAdvanceById,
  requestSalaryAdvance,
  approveSalaryAdvance,
  rejectSalaryAdvance,
  disburseSalaryAdvance,
} from "@/services/hrm/payroll/salary-advance";
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
  const eligibility = searchParams.get("eligibility") === "true";
  const status = searchParams.get("status") || undefined;
  const month = searchParams.get("month") || undefined;
  const department = searchParams.get("department") || undefined;

  // 1. Eligibility Check
  if (eligibility) {
    const targetUserId = isHrRole(auth.role) && searchParams.get("userId")
      ? searchParams.get("userId")!
      : auth.userId;

    const data = await calculateAccruedWage(tenantId, targetUserId);
    return NextResponse.json({ success: true, data });
  }

  // 2. Single Record
  if (id) {
    const record = await getSalaryAdvanceById(id);
    if (!record) return notFound("Salary advance record not found");

    if (!isHrRole(auth.role) && record.userId !== auth.userId) {
      return forbidden("You can only view your own salary advance requests");
    }

    return NextResponse.json({ success: true, data: record });
  }

  // 3. List
  const targetUserId = isHrRole(auth.role)
    ? searchParams.get("userId") || undefined
    : auth.userId;

  const list = await getSalaryAdvances(tenantId, {
    userId: targetUserId,
    status,
    month,
    department,
  });

  return NextResponse.json({ success: true, data: list, count: list.length });
});

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { requestedAmount, reason, department } = body;

  const numAmount = Number(requestedAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return badRequest("Requested amount must be a positive number");
  }

  if (!reason || !reason.trim()) {
    return badRequest("Reason for salary advance is required");
  }

  try {
    const user = (await hrmUsersService.findById(auth.userId)) as any;
    const advance = await requestSalaryAdvance(tenantId, {
      userId: auth.userId,
      employeeName: user?.displayName || user?.name || user?.email || "Employee",
      employeeEmail: user?.email || "",
      department: department || user?.department || "General",
      requestedAmount: numAmount,
      reason: reason.trim(),
    });

    return NextResponse.json({ success: true, data: advance, message: "Salary advance requested successfully" }, { status: 201 });
  } catch (err: any) {
    return badRequest(err.message || "Failed to request salary advance");
  }
});

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!isHrRole(auth.role)) {
    return forbidden("Only HR and Admin can approve, reject, or disburse salary advance requests");
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { id, action, rejectionReason } = body;
  if (!id) return badRequest("Advance request ID is required");
  if (!action) return badRequest("Action is required ('approve', 'reject', 'disburse')");

  const existing = await getSalaryAdvanceById(id);
  if (!existing) return notFound("Salary advance request not found");

  const approver = (await hrmUsersService.findById(auth.userId)) as any;
  const approverName = approver?.displayName || approver?.name || approver?.email || "HR Admin";

  if (action === "approve") {
    if (existing.status !== "pending") {
      return badRequest(`Cannot approve an advance with status '${existing.status}'`);
    }
    const updated = await approveSalaryAdvance(id, auth.userId, approverName);
    return NextResponse.json({ success: true, data: updated, message: "Salary advance approved" });
  }

  if (action === "disburse") {
    if (existing.status !== "approved") {
      return badRequest("Only approved salary advances can be disbursed");
    }
    const updated = await disburseSalaryAdvance(id, auth.userId, approverName);
    return NextResponse.json({ success: true, data: updated, message: "Salary advance disbursed to employee" });
  }

  if (action === "reject") {
    if (existing.status !== "pending") {
      return badRequest(`Cannot reject an advance with status '${existing.status}'`);
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      return badRequest("Rejection reason is required");
    }
    const updated = await rejectSalaryAdvance(id, auth.userId, approverName, rejectionReason.trim());
    return NextResponse.json({ success: true, data: updated, message: "Salary advance rejected" });
  }

  return badRequest(`Unsupported action '${action}'`);
});
