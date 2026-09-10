import "server-only";
import {
  leavePlansService,
  leaveTypesService,
  leaveBalancesService,
  leaveBalanceHistoryService,
  leaveRequestsService,
  overtimePoliciesService,
  overtimeRequestsService,
  overtimeTermsService,
} from "@/lib/hrm/firestore";
import type {
  LeavePlan,
  LeaveType,
  LeaveBalance,
  LeaveBalanceHistory,
  LeaveRequest,
  OvertimePolicy,
  OvertimeRequest,
  OvertimeTerm,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Leave & Overtime Service
// ══════════════════════════════════════════════════════════════════

// ── Leave Plans ────────────────────────────────────────

export async function getLeavePlans(tenantId: string): Promise<LeavePlan[]> {
  return leavePlansService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getLeavePlanById(id: string): Promise<LeavePlan | null> {
  return leavePlansService.findById(id);
}

export async function createLeavePlan(tenantId: string, data: Partial<LeavePlan>): Promise<LeavePlan> {
  return leavePlansService.create({ ...data, tenantId } as any);
}

export async function updateLeavePlan(id: string, data: Partial<LeavePlan>): Promise<LeavePlan | null> {
  return leavePlansService.update(id, data as any);
}

export async function deleteLeavePlan(id: string): Promise<boolean> {
  return leavePlansService.delete(id);
}

// ── Leave Types ────────────────────────────────────────

export async function getLeaveTypes(tenantId: string, planId?: string): Promise<LeaveType[]> {
  const where = planId ? [{ field: "planId", op: "==" as const, value: planId }] : [];
  return leaveTypesService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getLeaveTypeById(id: string): Promise<LeaveType | null> {
  return leaveTypesService.findById(id);
}

export async function createLeaveType(tenantId: string, data: Partial<LeaveType>): Promise<LeaveType> {
  return leaveTypesService.create({ ...data, tenantId } as any);
}

export async function updateLeaveType(id: string, data: Partial<LeaveType>): Promise<LeaveType | null> {
  return leaveTypesService.update(id, data as any);
}

export async function deleteLeaveType(id: string): Promise<boolean> {
  return leaveTypesService.delete(id);
}

// ── Leave Balances ─────────────────────────────────────

export async function getLeaveBalances(tenantId: string, userId: string): Promise<LeaveBalance[]> {
  return leaveBalancesService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
    orderByField: "leaveTypeId",
    orderByDirection: "asc",
  });
}

export async function getLeaveBalance(
  tenantId: string,
  userId: string,
  leaveTypeId: string,
  year: number
): Promise<LeaveBalance | null> {
  const balances = await leaveBalancesService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "leaveTypeId", op: "==", value: leaveTypeId },
      { field: "year", op: "==", value: year },
    ],
    limitCount: 1,
  });
  return balances[0] || null;
}

export async function allocateLeaveBalance(
  tenantId: string,
  userId: string,
  leaveTypeId: string,
  amount: number,
  year: number,
  reason?: string
): Promise<LeaveBalance> {
  const existing = await getLeaveBalance(tenantId, userId, leaveTypeId, year);

  if (existing) {
    const updated = await leaveBalancesService.update(existing.id, {
      totalAllocated: existing.totalAllocated + amount,
      remaining: existing.remaining + amount,
    } as any);

    await leaveBalanceHistoryService.create({
      userId,
      leaveTypeId,
      changeType: "allocated",
      amount,
      previousBalance: existing.remaining,
      newBalance: existing.remaining + amount,
      notes: reason,
    } as any);

    return updated!;
  }

  const balance = await leaveBalancesService.create({
    userId,
    leavePlanId: "",
    leaveTypeId,
    totalAllocated: amount,
    used: 0,
    pending: 0,
    remaining: amount,
    carriedForward: 0,
    year,
    tenantId,
  } as any);

  await leaveBalanceHistoryService.create({
    userId,
    leaveTypeId,
    changeType: "allocated",
    amount,
    previousBalance: 0,
    newBalance: amount,
    notes: reason,
  } as any);

  return balance;
}

// ── Leave Requests ─────────────────────────────────────

export async function getLeaveRequests(
  tenantId: string,
  options: {
    userId?: string;
    status?: LeaveRequest["status"];
    fromDate?: Date;
    toDate?: Date;
  } = {}
): Promise<LeaveRequest[]> {
  const where: { field: string; op: "==" | ">=" | "<="; value: unknown }[] = [];
  if (options.userId) where.push({ field: "userId", op: "==", value: options.userId });
  if (options.status) where.push({ field: "status", op: "==", value: options.status });

  return leaveRequestsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
  return leaveRequestsService.findById(id);
}

export async function applyLeave(
  tenantId: string,
  data: {
    userId: string;
    leaveTypeId: string;
    fromDate: Date;
    toDate: Date;
    reason: string;
    attachmentURL?: string;
  }
): Promise<LeaveRequest> {
  const diffTime = data.toDate.getTime() - data.fromDate.getTime();
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Check balance
  const leaveType = await leaveTypesService.findById(data.leaveTypeId);
  if (!leaveType) throw new Error("Leave type not found");

  const currentYear = data.fromDate.getFullYear();
  const balance = await getLeaveBalance(tenantId, data.userId, data.leaveTypeId, currentYear);

  if (balance && balance.remaining < totalDays) {
    throw new Error("Insufficient leave balance");
  }

  const request = await leaveRequestsService.create({
    ...data,
    totalDays,
    status: "pending",
    tenantId,
  } as any);

  // Update pending balance
  if (balance) {
    await leaveBalancesService.update(balance.id, {
      pending: balance.pending + totalDays,
      remaining: balance.remaining - totalDays,
    } as any);

    await leaveBalanceHistoryService.create({
      userId: data.userId,
      leaveTypeId: data.leaveTypeId,
      changeType: "used",
      amount: totalDays,
      previousBalance: balance.remaining,
      newBalance: balance.remaining - totalDays,
      referenceId: request.id,
      notes: `Leave applied: ${data.reason}`,
    } as any);
  }

  return request;
}

export async function approveLeave(
  id: string,
  approvedById: string
): Promise<LeaveRequest | null> {
  return leaveRequestsService.update(id, {
    status: "approved",
    approvedById,
    approvedAt: new Date(),
  } as any);
}

export async function rejectLeave(
  id: string,
  approvedById: string,
  reason: string
): Promise<LeaveRequest | null> {
  const request = await leaveRequestsService.findById(id);
  if (!request) return null;

  // Restore balance
  const balance = await getLeaveBalance(
    request.tenantId,
    request.userId,
    request.leaveTypeId,
    new Date(request.fromDate as any).getFullYear()
  );

  if (balance) {
    await leaveBalancesService.update(balance.id, {
      pending: balance.pending - request.totalDays,
      remaining: balance.remaining + request.totalDays,
    } as any);
  }

  return leaveRequestsService.update(id, {
    status: "rejected",
    approvedById,
    approvedAt: new Date(),
    rejectionReason: reason,
  } as any);
}

export async function cancelLeave(id: string): Promise<LeaveRequest | null> {
  const request = await leaveRequestsService.findById(id);
  if (!request || request.status !== "pending") return null;

  // Restore balance
  const balance = await getLeaveBalance(
    request.tenantId,
    request.userId,
    request.leaveTypeId,
    new Date(request.fromDate as any).getFullYear()
  );

  if (balance) {
    await leaveBalancesService.update(balance.id, {
      pending: balance.pending - request.totalDays,
      remaining: balance.remaining + request.totalDays,
    } as any);
  }

  return leaveRequestsService.update(id, { status: "cancelled" } as any);
}

// ── Overtime Policies ──────────────────────────────────

export async function getOvertimePolicies(tenantId: string): Promise<OvertimePolicy[]> {
  return overtimePoliciesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getOvertimePolicyById(id: string): Promise<OvertimePolicy | null> {
  return overtimePoliciesService.findById(id);
}

export async function createOvertimePolicy(tenantId: string, data: Partial<OvertimePolicy>): Promise<OvertimePolicy> {
  return overtimePoliciesService.create({ ...data, tenantId } as any);
}

export async function updateOvertimePolicy(id: string, data: Partial<OvertimePolicy>): Promise<OvertimePolicy | null> {
  return overtimePoliciesService.update(id, data as any);
}

// ── Overtime Requests ──────────────────────────────────

export async function getOvertimeRequests(
  tenantId: string,
  userId?: string,
  status?: OvertimeRequest["status"]
): Promise<OvertimeRequest[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (userId) where.push({ field: "userId", op: "==", value: userId });
  if (status) where.push({ field: "status", op: "==", value: status });

  return overtimeRequestsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createOvertimeRequest(
  tenantId: string,
  data: {
    userId: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    reason: string;
    policyId?: string;
    compensation: OvertimeRequest["compensation"];
  }
): Promise<OvertimeRequest> {
  const totalHours = (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60 * 60);
  const rateMultiplier = 1.5; // Default multiplier

  return overtimeRequestsService.create({
    ...data,
    totalHours,
    rateMultiplier,
    status: "pending",
    tenantId,
  } as any);
}

export async function approveOvertimeRequest(
  id: string,
  approvedById: string
): Promise<OvertimeRequest | null> {
  return overtimeRequestsService.update(id, {
    status: "approved",
    approvedById,
    approvedAt: new Date(),
  } as any);
}

export async function rejectOvertimeRequest(
  id: string,
  approvedById: string
): Promise<OvertimeRequest | null> {
  return overtimeRequestsService.update(id, {
    status: "rejected",
    approvedById,
    approvedAt: new Date(),
  } as any);
}

// ── Overtime Terms ─────────────────────────────────────

export async function getOvertimeTerms(policyId: string): Promise<OvertimeTerm[]> {
  return overtimeTermsService.findMany({
    where: [{ field: "policyId", op: "==", value: policyId }],
  });
}

export async function createOvertimeTerm(tenantId: string, data: Partial<OvertimeTerm>): Promise<OvertimeTerm> {
  return overtimeTermsService.create({ ...data, tenantId } as any);
}

// ── Leave Dashboard ────────────────────────────────────

export async function getLeaveDashboard(tenantId: string): Promise<{
  pendingRequests: number;
  approvedToday: number;
  onLeaveToday: number;
  totalLeaveTypes: number;
}> {
  const [pending, types] = await Promise.all([
    leaveRequestsService.findManyInTenant(tenantId, {
      where: [{ field: "status", op: "==", value: "pending" }],
    }),
    getLeaveTypes(tenantId),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const onLeaveToday = await leaveRequestsService.findManyInTenant(tenantId, {
    where: [
      { field: "status", op: "==", value: "approved" },
    ],
  });

  return {
    pendingRequests: pending.length,
    approvedToday: onLeaveToday.length,
    onLeaveToday: onLeaveToday.length,
    totalLeaveTypes: types.length,
  };
}
