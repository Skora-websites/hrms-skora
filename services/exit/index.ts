import "server-only";
import {
  employeeExitsService,
  exitSettingsService,
  noticePeriodsService,
} from "@/lib/hrm/firestore";
import type {
  EmployeeExit,
  EmployeeExitSetting,
  ExitClearanceItem,
  NoticePeriod,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Exit Service
// ══════════════════════════════════════════════════════════════════

export async function getExitSettings(tenantId: string): Promise<EmployeeExitSetting | null> {
  const settings = await exitSettingsService.findManyInTenant(tenantId, {
    limitCount: 1,
  });
  return settings[0] || null;
}

export async function updateExitSettings(
  id: string,
  data: Partial<EmployeeExitSetting>
): Promise<EmployeeExitSetting | null> {
  return exitSettingsService.update(id, data as any);
}

// ── Employee Exits ─────────────────────────────────────

export async function getEmployeeExits(
  tenantId: string,
  status?: EmployeeExit["status"]
): Promise<EmployeeExit[]> {
  const where = status
    ? [{ field: "status", op: "==" as const, value: status }]
    : [];
  return employeeExitsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getEmployeeExitById(id: string): Promise<EmployeeExit | null> {
  return employeeExitsService.findById(id);
}

export async function initiateExit(
  tenantId: string,
  data: {
    userId: string;
    resignationDate: Date;
    lastWorkingDate: Date;
    reason: string;
    exitType: EmployeeExit["exitType"];
  }
): Promise<EmployeeExit> {
  const settings = await getExitSettings(tenantId);

  const clearanceItems: ExitClearanceItem[] = (settings?.clearanceDepartments || [
    "IT",
    "Finance",
    "HR",
    "Administration",
  ]).map((dept) => ({
    id: `clear_${Date.now()}_${dept.toLowerCase()}`,
    item: `${dept} Clearance`,
    assignedDepartment: dept,
    status: "pending",
  }));

  return employeeExitsService.create({
    ...data,
    status: "initiated",
    clearanceItems,
    tenantId,
  } as any);
}

export async function updateExitStatus(
  id: string,
  status: EmployeeExit["status"]
): Promise<EmployeeExit | null> {
  return employeeExitsService.update(id, { status } as any);
}

export async function updateExitClearance(
  exitId: string,
  clearanceId: string,
  clearedBy: string,
  notes?: string
): Promise<EmployeeExit | null> {
  const exit = await employeeExitsService.findById(exitId);
  if (!exit) return null;

  const items = exit.clearanceItems.map((item) => {
    if (item.id === clearanceId) {
      return {
        ...item,
        status: "cleared" as const,
        clearedBy,
        clearedAt: new Date(),
        notes,
      };
    }
    return item;
  });

  const allCleared = items.every((item) => item.status === "cleared");
  const newStatus = allCleared ? "completed" : exit.status;

  return employeeExitsService.update(exitId, {
    clearanceItems: items,
    status: newStatus,
  } as any);
}

export async function addExitInterview(
  id: string,
  interview: string
): Promise<EmployeeExit | null> {
  return employeeExitsService.update(id, { exitInterview: interview } as any);
}

// ── Notice Periods ─────────────────────────────────────

export async function getEmployeeNoticePeriod(
  userId: string
): Promise<NoticePeriod | null> {
  const periods = await noticePeriodsService.findMany({
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "status", op: "==", value: "active" },
    ],
    limitCount: 1,
  });
  return periods[0] || null;
}

export async function initiateNoticePeriod(
  tenantId: string,
  data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    remainingDays: number;
  }
): Promise<NoticePeriod> {
  return noticePeriodsService.create({
    ...data,
    status: "active",
    tenantId,
  } as any);
}

export async function waiveNoticePeriod(
  id: string,
  waivedById: string
): Promise<NoticePeriod | null> {
  return noticePeriodsService.update(id, {
    status: "waived",
    waivedById,
    waivedAt: new Date(),
  } as any);
}

export async function extendNoticePeriod(
  id: string,
  extendedDays: number,
  reason: string
): Promise<NoticePeriod | null> {
  const period = await noticePeriodsService.findById(id);
  if (!period) return null;

  const newEndDate = new Date(period.endDate as any);
  newEndDate.setDate(newEndDate.getDate() + extendedDays);

  return noticePeriodsService.update(id, {
    extendedDays,
    extendedReason: reason,
    endDate: newEndDate,
    remainingDays: period.remainingDays + extendedDays,
    status: "extended",
  } as any);
}

// ── Dashboard ──────────────────────────────────────────

export async function getExitDashboard(tenantId: string): Promise<{
  totalExits: number;
  pendingClearance: number;
  noticePeriodActive: number;
  completedThisMonth: number;
}> {
  const [exits, noticePeriods] = await Promise.all([
    getEmployeeExits(tenantId),
    noticePeriodsService.findManyInTenant(tenantId, {
      where: [{ field: "status", op: "==", value: "active" }],
    }),
  ]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return {
    totalExits: exits.length,
    pendingClearance: exits.filter((e) => e.status === "clearance_pending").length,
    noticePeriodActive: noticePeriods.length,
    completedThisMonth: exits.filter((e) => {
      const completedDate = new Date(e.updatedAt as any);
      return (
        e.status === "completed" &&
        completedDate.getMonth() === currentMonth &&
        completedDate.getFullYear() === currentYear
      );
    }).length,
  };
}
