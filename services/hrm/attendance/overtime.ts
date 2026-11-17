import "server-only";
import {
  overtimeRecordsService,
  leaveBalancesService,
  leaveTypesService,
} from "@/lib/hrm/firestore";
import type { OvertimeRecord } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Overtime & Comp-Off Engine Service
// ══════════════════════════════════════════════════════════════════

export async function getOvertimeRecords(
  tenantId: string,
  options: {
    userId?: string;
    department?: string;
    status?: string;
    month?: string; // YYYY-MM
    compensationType?: string;
  } = {}
): Promise<OvertimeRecord[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.userId) {
    where.push({ field: "userId", op: "==", value: options.userId });
  }
  if (options.status) {
    where.push({ field: "status", op: "==", value: options.status });
  }
  if (options.compensationType) {
    where.push({ field: "compensationType", op: "==", value: options.compensationType });
  }

  let list = await overtimeRecordsService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  if (options.department) {
    const dLower = options.department.toLowerCase();
    list = list.filter((r) => r.department?.toLowerCase() === dLower);
  }

  if (options.month) {
    list = list.filter((r) => r.date && r.date.startsWith(options.month!));
  }

  return list;
}

export async function getOvertimeRecordById(id: string): Promise<OvertimeRecord | null> {
  return overtimeRecordsService.findById(id);
}

export async function claimOvertime(
  tenantId: string,
  data: {
    userId: string;
    employeeName: string;
    employeeEmail: string;
    department?: string;
    date: string; // YYYY-MM-DD
    shiftStartTime?: string;
    shiftEndTime?: string;
    actualCheckIn?: string;
    actualCheckOut?: string;
    shiftMinutes?: number;
    actualMinutes?: number;
    compensationType: "pay" | "comp_off";
    hourlyRate?: number;
  }
): Promise<OvertimeRecord> {
  const shiftMins = Number(data.shiftMinutes || 480);
  const actualMins = Number(data.actualMinutes || 0);
  const overtimeMinutes = Math.max(0, actualMins - shiftMins);

  if (overtimeMinutes < 30) {
    throw new Error("A minimum of 30 minutes overtime is required to file an overtime claim");
  }

  const hourlyRate = Number(data.hourlyRate || 250);
  // 1.5x standard overtime pay multiplier
  const overtimePay =
    data.compensationType === "pay"
      ? Math.round((hourlyRate * 1.5 * (overtimeMinutes / 60)) * 100) / 100
      : 0;

  // Comp-off calculation: >= 4 hours (240m) = 0.5 day; >= 8 hours (480m) = 1.0 day
  let compOffDaysCredited = 0;
  if (data.compensationType === "comp_off") {
    if (overtimeMinutes >= 480) {
      compOffDaysCredited = 1.0;
    } else if (overtimeMinutes >= 240) {
      compOffDaysCredited = 0.5;
    } else {
      // 1-3 hours can be banked proportionally (0.25 day)
      compOffDaysCredited = Math.round((overtimeMinutes / 480) * 100) / 100;
    }
  }

  const now = new Date();
  const record: Omit<OvertimeRecord, "id"> = {
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    date: data.date,
    shiftStartTime: data.shiftStartTime || "09:00",
    shiftEndTime: data.shiftEndTime || "18:00",
    actualCheckIn: data.actualCheckIn || "",
    actualCheckOut: data.actualCheckOut || "",
    shiftMinutes: shiftMins,
    actualMinutes: actualMins,
    overtimeMinutes,
    compensationType: data.compensationType,
    hourlyRate,
    overtimePay,
    compOffDaysCredited,
    status: "pending",
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: null,
    rejectionReason: undefined,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return overtimeRecordsService.create({
    tenantId,
    userId: data.userId,
    employeeName: data.employeeName,
    employeeEmail: data.employeeEmail,
    department: data.department || "General",
    date: data.date,
    shiftStartTime: data.shiftStartTime || "09:00",
    shiftEndTime: data.shiftEndTime || "18:00",
    actualCheckIn: data.actualCheckIn || "",
    actualCheckOut: data.actualCheckOut || "",
    shiftMinutes: shiftMins,
    actualMinutes: actualMins,
    overtimeMinutes,
    compensationType: data.compensationType,
    hourlyRate,
    overtimePay,
    compOffDaysCredited,
    status: "pending",
  } as any);
}

export async function approveOvertime(
  id: string,
  approverId: string,
  approverName: string
): Promise<OvertimeRecord | null> {
  const existing = await overtimeRecordsService.findById(id);
  if (!existing) return null;

  const now = new Date();
  let newStatus: "approved" | "credited" = "approved";

  // If compensation is Comp-Off, credit leave balances!
  if (existing.compensationType === "comp_off" && existing.compOffDaysCredited > 0) {
    newStatus = "credited";
    try {
      // Find or create Comp-Off leave type
      const leaveTypes = await leaveTypesService.findManyInTenant(existing.tenantId, {});
      let compOffType = leaveTypes.find(
        (t) => t.name.toLowerCase().includes("comp") || t.code?.toLowerCase().includes("comp")
      );

      if (!compOffType) {
        const createdType = await leaveTypesService.create({
          tenantId: existing.tenantId,
          name: "Compensatory Off",
          code: "COMP_OFF",
          daysPerYear: 0,
          paid: true,
          requiresApproval: true,
          allowCarryForward: true,
        } as any);
        compOffType = createdType as any;
      }

      const compTypeId = compOffType?.id || "COMP_OFF";
      const compTypeName = compOffType?.name || "Compensatory Off";

      // Find user leave balance
      const currentYear = new Date().getFullYear();
      const userBalances = await leaveBalancesService.findManyInTenant(existing.tenantId, {
        where: [
          { field: "userId", op: "==", value: existing.userId },
        ],
      });

      const compBalance = userBalances.find(
        (b: any) => b.leaveTypeId === compTypeId || b.leaveTypeName?.toLowerCase().includes("comp")
      );

      if (compBalance) {
        const currentAllocated = Number(compBalance.totalAllocated || compBalance.allocated || 0);
        const currentRemaining = Number(compBalance.remaining || 0);
        await leaveBalancesService.update(compBalance.id, {
          totalAllocated: currentAllocated + existing.compOffDaysCredited,
          remaining: currentRemaining + existing.compOffDaysCredited,
          updatedAt: now,
        } as any);
      } else {
        await leaveBalancesService.create({
          tenantId: existing.tenantId,
          userId: existing.userId,
          leaveTypeId: compTypeId,
          leaveTypeName: compTypeName,
          totalAllocated: existing.compOffDaysCredited,
          used: 0,
          remaining: existing.compOffDaysCredited,
          year: currentYear,
        } as any);
      }
    } catch (err) {
      console.error("Failed to credit comp-off leave balance:", err);
    }
  }

  await overtimeRecordsService.update(id, {
    status: newStatus,
    approvedBy: approverId,
    approvedByName: approverName,
    approvedAt: now,
    rejectionReason: undefined,
    updatedAt: now,
  });

  return overtimeRecordsService.findById(id);
}

export async function rejectOvertime(
  id: string,
  approverId: string,
  approverName: string,
  reason: string
): Promise<OvertimeRecord | null> {
  const existing = await overtimeRecordsService.findById(id);
  if (!existing) return null;

  const now = new Date();
  await overtimeRecordsService.update(id, {
    status: "rejected",
    approvedBy: approverId,
    approvedByName: approverName,
    rejectionReason: reason,
    updatedAt: now,
  });

  return overtimeRecordsService.findById(id);
}
