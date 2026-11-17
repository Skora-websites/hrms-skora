import { NextRequest, NextResponse } from "next/server";
import {
  getOvertimeRecords,
  getOvertimeRecordById,
  claimOvertime,
  approveOvertime,
  rejectOvertime,
} from "@/services/hrm/attendance/overtime";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
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
  const status = searchParams.get("status") || undefined;
  const month = searchParams.get("month") || undefined;
  const department = searchParams.get("department") || undefined;
  const compensationType = searchParams.get("compensationType") || undefined;

  // Single Record
  if (id) {
    const record = await getOvertimeRecordById(id);
    if (!record) return notFound("Overtime record not found");

    if (!isHrRole(auth.role) && record.userId !== auth.userId) {
      return forbidden("You can only view your own overtime records");
    }

    return NextResponse.json({ success: true, data: record });
  }

  // Scoping: HR can query any user; employee is scoped to self
  const targetUserId = isHrRole(auth.role)
    ? searchParams.get("userId") || undefined
    : auth.userId;

  const list = await getOvertimeRecords(tenantId, {
    userId: targetUserId,
    department,
    status,
    month,
    compensationType,
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

  const {
    date,
    shiftStartTime,
    shiftEndTime,
    actualCheckIn,
    actualCheckOut,
    shiftMinutes,
    actualMinutes,
    compensationType,
    hourlyRate,
    department,
  } = body;

  if (!date) return badRequest("Date is required");
  if (!compensationType || (compensationType !== "pay" && compensationType !== "comp_off")) {
    return badRequest("compensationType must be either 'pay' or 'comp_off'");
  }

  try {
    const currentUser = await hrmUsersService.findById(auth.userId);
    const employeeName = currentUser?.displayName || currentUser?.email || "Employee";
    const employeeEmail = currentUser?.email || "";
    const userDept = department || (currentUser as any)?.department || "General";

    const record = await claimOvertime(tenantId, {
      userId: auth.userId,
      employeeName,
      employeeEmail,
      department: userDept,
      date,
      shiftStartTime,
      shiftEndTime,
      actualCheckIn,
      actualCheckOut,
      shiftMinutes: shiftMinutes ? Number(shiftMinutes) : 480,
      actualMinutes: actualMinutes ? Number(actualMinutes) : 0,
      compensationType,
      hourlyRate: hourlyRate ? Number(hourlyRate) : 250,
    });

    return NextResponse.json({ success: true, data: record, message: "Overtime claim submitted successfully" }, { status: 201 });
  } catch (err: any) {
    return badRequest(err.message || "Failed to submit overtime claim");
  }
});

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  if (!isHrRole(auth.role)) {
    return forbidden("Only HR and Admin can approve or reject overtime claims");
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { id, action, rejectionReason } = body;
  if (!id) return badRequest("Overtime ID is required");
  if (!action) return badRequest("Action is required ('approve', 'reject')");

  const existing = await getOvertimeRecordById(id);
  if (!existing) return notFound("Overtime record not found");

  const approver = await hrmUsersService.findById(auth.userId);
  const approverName = approver?.displayName || approver?.email || "HR Admin";

  if (action === "approve") {
    if (existing.status !== "pending") {
      return badRequest(`Cannot approve an overtime record with status '${existing.status}'`);
    }
    const updated = await approveOvertime(id, auth.userId, approverName);
    return NextResponse.json({
      success: true,
      data: updated,
      message: existing.compensationType === "comp_off"
        ? `Overtime approved and ${existing.compOffDaysCredited} Comp-Off days credited to leave balance!`
        : "Overtime approved for payroll processing",
    });
  }

  if (action === "reject") {
    if (existing.status !== "pending") {
      return badRequest(`Cannot reject an overtime record with status '${existing.status}'`);
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      return badRequest("Rejection reason is required");
    }
    const updated = await rejectOvertime(id, auth.userId, approverName, rejectionReason.trim());
    return NextResponse.json({ success: true, data: updated, message: "Overtime claim rejected" });
  }

  return badRequest(`Unsupported action '${action}'`);
});
