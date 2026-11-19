import "server-only";
import {
  shiftsService,
  shiftAssignmentsService,
  shiftSwapRequestsService,
  hrmUsersService,
  notificationsService,
  attendanceService,
  regularizationRequestsService,
} from "@/lib/hrm/firestore";
import type { Shift, ShiftAssignment, ShiftSwapRequest } from "@/types";
import { getDb } from "@/lib/db/mysql";

// ══════════════════════════════════════════════════════════════════
// Shift & Roster Management Engine
// ══════════════════════════════════════════════════════════════════

export interface RosterGridEmployee {
  id: string;
  name: string;
  displayName: string;
  email: string;
  department: string;
  designation: string;
  assignedShifts: Record<string, { shiftId: string; shiftName: string; color: string; startTime: string; endTime: string }>;
}

export async function getShiftRosterGrid(
  tenantId: string = "default",
  startDate: string,
  endDate: string,
  department?: string
): Promise<{ dates: string[]; employees: RosterGridEmployee[]; shifts: Shift[] }> {
  const [shifts, allUsers, assignments] = await Promise.all([
    shiftsService.findManyInTenant(tenantId),
    hrmUsersService.findManyInTenant(tenantId),
    shiftAssignmentsService.findManyInTenant(tenantId),
  ]);

  const shiftMap = new Map<string, Shift>();
  shifts.forEach((s) => shiftMap.set(s.id, s));

  // Generate date array from startDate to endDate (e.g. YYYY-MM-DD)
  const dates: string[] = [];
  const curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }

  // Filter employees
  let filteredUsers = allUsers.filter(
    (u: any) =>
      u.status !== "terminated" &&
      u.status !== "resigned" &&
      u.role !== "super_admin" &&
      u.role !== "ceo"
  );
  if (department && department !== "all") {
    filteredUsers = filteredUsers.filter((u: any) => (u.department || u.departmentName) === department);
  }

  // Default General Shift
  const defaultShift = shifts.find((s) => s.name.toLowerCase().includes("general")) || shifts[0] || {
    id: "shift-default",
    name: "General Shift",
    color: "#3B82F6",
    startTime: "10:00",
    endTime: "19:00",
  };

  const employees: RosterGridEmployee[] = filteredUsers.map((u: any) => {
    const userAssignments = assignments.filter((a: any) => a.userId === u.id);
    const assignedShifts: RosterGridEmployee["assignedShifts"] = {};

    dates.forEach((d) => {
      // Find matching assignment covering date d
      const found = userAssignments.find((a: any) => {
        const s = a.startDate ? new Date(a.startDate).toISOString().slice(0, 10) : "";
        const e = a.endDate ? new Date(a.endDate).toISOString().slice(0, 10) : s;
        return d >= s && (!a.endDate || d <= e);
      });

      if (found) {
        const shiftObj = shiftMap.get(found.shiftId);
        assignedShifts[d] = {
          shiftId: found.shiftId,
          shiftName: shiftObj?.name || found.shiftName || "Assigned Shift",
          color: shiftObj?.color || "#10B981",
          startTime: shiftObj?.startTime || "09:00",
          endTime: shiftObj?.endTime || "18:00",
        };
      } else {
        assignedShifts[d] = {
          shiftId: defaultShift.id,
          shiftName: defaultShift.name,
          color: defaultShift.color || "#3B82F6",
          startTime: defaultShift.startTime || "10:00",
          endTime: defaultShift.endTime || "19:00",
        };
      }
    });

    return {
      id: u.id,
      name: u.displayName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      displayName: u.displayName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      email: u.email,
      department: u.department || u.departmentName || "General",
      designation: u.designation || u.designationName || "Staff",
      assignedShifts,
    };
  });

  return { dates, employees, shifts };
}

export async function batchAssignRoster(
  tenantId: string = "default",
  entries: Array<{ userId: string; shiftId: string; date: string }>
): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    const shift = await shiftsService.findById(entry.shiftId);
    const user = await hrmUsersService.findById(entry.userId);
    if (!shift || !user) continue;

    const startDate = new Date(entry.date);
    const endDate = new Date(entry.date);

    await shiftAssignmentsService.createInTenant(tenantId, {
      userId: entry.userId,
      userName: user.displayName || (user as any).name || user.email,
      shiftId: entry.shiftId,
      shiftName: shift.name,
      startDate,
      endDate,
      status: "active",
    } as any);
    count++;
  }
  return count;
}

// ══════════════════════════════════════════════════════════════════
// Shift Swapping & Peer Approvals
// ══════════════════════════════════════════════════════════════════

export async function createShiftSwapRequest(
  tenantId: string = "default",
  data: {
    requesterId: string;
    requesterName: string;
    requesterShiftId: string;
    targetUserId: string;
    targetUserName: string;
    targetShiftId?: string;
    shiftDate: string;
    reason: string;
  }
): Promise<ShiftSwapRequest> {
  const swap = await shiftSwapRequestsService.createInTenant(tenantId, {
    ...data,
    peerStatus: "pending",
    managerStatus: "pending",
    status: "pending",
  });

  // Notify peer employee
  await notificationsService.createInTenant(tenantId, {
    userId: data.targetUserId,
    title: "Shift Swap Request",
    body: `${data.requesterName} wants to swap shift with you on ${data.shiftDate}.`,
    type: "attendance",
    isRead: false,
  });

  return swap;
}

export async function respondPeerShiftSwap(
  swapId: string,
  peerUserId: string,
  response: "accepted" | "declined"
): Promise<ShiftSwapRequest | null> {
  const swap = await shiftSwapRequestsService.findById(swapId);
  if (!swap) return null;
  if (swap.targetUserId !== peerUserId) {
    throw new Error("Unauthorized to respond to this swap request");
  }

  const peerStatus = response === "accepted" ? "accepted" : "declined";
  const status = response === "accepted" ? "pending" : "rejected";

  const updated = await shiftSwapRequestsService.update(swapId, {
    peerStatus,
    status,
  });

  // If accepted by peer, notify manager for final approval
  if (response === "accepted") {
    const requester = await hrmUsersService.findById(swap.requesterId);
    const managerName = (requester as any)?.reportingManager;
    await notificationsService.createInTenant(swap.tenantId, {
      userId: "manager",
      title: "Shift Swap Awaiting Manager Approval",
      body: `${swap.requesterName} and ${swap.targetUserName} agreed to swap shifts on ${swap.shiftDate}. Manager approval required.`,
      type: "attendance",
      isRead: false,
    });
  }

  return updated;
}

export async function approveManagerShiftSwap(
  swapId: string,
  managerId: string,
  managerName: string,
  decision: "approved" | "rejected"
): Promise<ShiftSwapRequest | null> {
  const swap = await shiftSwapRequestsService.findById(swapId);
  if (!swap) return null;

  const managerStatus = decision === "approved" ? "approved" : "rejected";
  const status = decision === "approved" ? "approved" : "rejected";

  const updated = await shiftSwapRequestsService.update(swapId, {
    managerStatus,
    status,
    approvedBy: managerId,
    approvedByName: managerName,
    approvedAt: new Date() as any,
  });

  // If approved, perform the actual swap of shift assignments in MySQL
  if (decision === "approved") {
    const db = await getDb();
    if (db) {
      const shiftDate = new Date(swap.shiftDate);
      // Create reciprocal assignments for the day
      await Promise.all([
        shiftAssignmentsService.createInTenant(swap.tenantId, {
          userId: swap.requesterId,
          userName: swap.requesterName,
          shiftId: swap.targetShiftId || swap.requesterShiftId,
          startDate: shiftDate,
          endDate: shiftDate,
          status: "active",
        } as any),
        shiftAssignmentsService.createInTenant(swap.tenantId, {
          userId: swap.targetUserId,
          userName: swap.targetUserName,
          shiftId: swap.requesterShiftId,
          startDate: shiftDate,
          endDate: shiftDate,
          status: "active",
        } as any),
      ]);
    }

    // Notify both employees
    await Promise.all([
      notificationsService.createInTenant(swap.tenantId, {
        userId: swap.requesterId,
        title: "Shift Swap Approved",
        body: `Your shift swap with ${swap.targetUserName} on ${swap.shiftDate} has been approved.`,
        type: "attendance",
        isRead: false,
      }),
      notificationsService.createInTenant(swap.tenantId, {
        userId: swap.targetUserId,
        title: "Shift Swap Approved",
        body: `Your shift swap with ${swap.requesterName} on ${swap.shiftDate} has been approved.`,
        type: "attendance",
        isRead: false,
      }),
    ]);
  }

  return updated;
}

export async function getShiftSwapRequests(
  tenantId: string = "default",
  userId?: string,
  isManager: boolean = false
): Promise<ShiftSwapRequest[]> {
  const all = await shiftSwapRequestsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  if (!userId) return all;
  if (isManager) {
    // Managers see requests where peer accepted and awaiting manager approval, or all team swaps
    return all;
  }

  return all.filter((s: ShiftSwapRequest) => s.requesterId === userId || s.targetUserId === userId);
}

// ══════════════════════════════════════════════════════════════════
// Standard General Shift (10:00 AM - 07:00 PM, Mon-Sat) & Punctuality Engine
// ══════════════════════════════════════════════════════════════════

export const STANDARD_SHIFT_CONFIG = {
  id: "shift-general-10-19",
  name: "General Shift (10:00 AM - 07:00 PM)",
  startTime: "10:00",
  endTime: "19:00",
  graceMinutes: 15, // On-time cutoff at 10:15 AM
  earlyExitBufferMinutes: 15, // Early exit before 18:45 (06:45 PM)
  fullDayMinutes: 480, // >= 8 hours effective work
  halfDayMinutes: 240, // >= 4 hours effective work
  workDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
  weeklyOffDay: 0, // Sunday
};

export interface AttendanceEvaluationResult {
  date: string;
  isWeeklyOff: boolean;
  isLate: boolean;
  isEarlyDeparture: boolean;
  effectiveWorkMinutes: number;
  totalBreakMinutes: number;
  workHours: number;
  status: "present" | "half_day" | "absent" | "week_off" | "incomplete";
  isAutoClosed: boolean;
  requiresRegularization: boolean;
  lateMinutes: number;
}

export function evaluateDailyAttendance(params: {
  date: Date | string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  totalBreakMinutes?: number;
  isCurrentDayCompleted?: boolean;
}): AttendanceEvaluationResult {
  const d = typeof params.date === "string" ? new Date(params.date) : params.date;
  const dayOfWeek = d.getDay(); // 0 is Sunday
  const dateStr = typeof params.date === "string" ? params.date : d.toISOString().slice(0, 10);

  // 1. Sunday is official weekly off
  if (dayOfWeek === 0) {
    return {
      date: dateStr,
      isWeeklyOff: true,
      isLate: false,
      isEarlyDeparture: false,
      effectiveWorkMinutes: 0,
      totalBreakMinutes: 0,
      workHours: 0,
      status: "week_off",
      isAutoClosed: false,
      requiresRegularization: false,
      lateMinutes: 0,
    };
  }

  // If no check-in exists at all for a working day
  if (!params.checkIn) {
    return {
      date: dateStr,
      isWeeklyOff: false,
      isLate: false,
      isEarlyDeparture: false,
      effectiveWorkMinutes: 0,
      totalBreakMinutes: 0,
      workHours: 0,
      status: "absent",
      isAutoClosed: false,
      requiresRegularization: false,
      lateMinutes: 0,
    };
  }

  const checkInDate = typeof params.checkIn === "string" ? new Date(params.checkIn) : params.checkIn;
  const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();

  // 10:00 AM = 600 minutes. Grace cutoff: 10:15 AM = 615 minutes.
  const isLate = checkInMinutes > 615;
  const lateMinutes = isLate ? checkInMinutes - 600 : 0;

  // If check-out is missing
  if (!params.checkOut) {
    const isCompleted = params.isCurrentDayCompleted ?? true;
    return {
      date: dateStr,
      isWeeklyOff: false,
      isLate,
      isEarlyDeparture: false,
      effectiveWorkMinutes: 0,
      totalBreakMinutes: params.totalBreakMinutes || 0,
      workHours: 0,
      status: isCompleted ? "incomplete" : "present",
      isAutoClosed: isCompleted,
      requiresRegularization: isCompleted,
      lateMinutes,
    };
  }

  const checkOutDate = typeof params.checkOut === "string" ? new Date(params.checkOut) : params.checkOut;
  const checkOutMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();

  // 07:00 PM = 19:00 = 1140 minutes. Early exit buffer: 18:45 = 1125 minutes.
  const isEarlyDeparture = checkOutMinutes < 1125;

  const totalElapsedMinutes = Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000));
  const breakMins = params.totalBreakMinutes || 0;
  const effectiveWorkMinutes = Math.max(0, totalElapsedMinutes - breakMins);
  const workHours = Number((effectiveWorkMinutes / 60).toFixed(2));

  // Determine status based on minimum hours matrix:
  // >= 480 min (8h) -> Present
  // 240 - 479 min (4h - 8h) -> Half Day
  // < 240 min (< 4h) -> Absent
  let status: AttendanceEvaluationResult["status"] = "present";
  if (effectiveWorkMinutes >= STANDARD_SHIFT_CONFIG.fullDayMinutes) {
    status = "present";
  } else if (effectiveWorkMinutes >= STANDARD_SHIFT_CONFIG.halfDayMinutes) {
    status = "half_day";
  } else {
    status = "absent";
  }

  return {
    date: dateStr,
    isWeeklyOff: false,
    isLate,
    isEarlyDeparture,
    effectiveWorkMinutes,
    totalBreakMinutes: breakMins,
    workHours,
    status,
    isAutoClosed: false,
    requiresRegularization: false,
    lateMinutes,
  };
}

export async function reconcileZombiePunches(
  tenantId: string = "default",
  dateStr: string
): Promise<{ processed: number; autoClosed: number }> {
  const records = await attendanceService.findManyInTenant(tenantId, {
    where: [{ field: "date", op: "==", value: dateStr }],
  });

  let processed = 0;
  let autoClosed = 0;

  for (const record of records) {
    const raw: any = record;
    const hasCheckIn = Boolean(raw.checkIn || raw.punchInTime);
    const hasCheckOut = Boolean(raw.checkOut || raw.punchOutTime);

    if (hasCheckIn && !hasCheckOut) {
      processed++;
      await attendanceService.update(record.id, {
        status: "incomplete",
        isAutoClosed: true,
        requiresRegularization: true,
        notes: "Missing punch-out at 19:00 shift end. Auto-closed at midnight. Regularization required.",
      } as any);

      try {
        await regularizationRequestsService.createInTenant(tenantId, {
          userId: raw.userId,
          attendanceId: record.id,
          type: "check_out",
          date: dateStr as any,
          reason: "System auto-closed unclosed punch at shift end. Please regularize actual checkout time.",
          status: "pending",
        } as any);
      } catch (err) {
        console.warn(`Failed to create regularization request for ${raw.userId}:`, err);
      }

      autoClosed++;
    }
  }

  return { processed, autoClosed };
}
