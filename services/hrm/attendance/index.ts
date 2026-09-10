import "server-only";
import {
  attendanceService,
  attendanceStatsService,
  shiftsService,
  weeklyOffsService,
  regularizationRequestsService,
} from "@/lib/hrm/firestore";
import type {
  EmployeeAttendance,
  AttendanceStats,
  Shift,
  WeeklyOff,
  RegularizationRequest,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Attendance Service
// ══════════════════════════════════════════════════════════════════

// ── Shifts ─────────────────────────────────────────────

export async function getShifts(tenantId: string): Promise<Shift[]> {
  return shiftsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getShiftById(id: string): Promise<Shift | null> {
  return shiftsService.findById(id);
}

export async function createShift(tenantId: string, data: Partial<Shift>): Promise<Shift> {
  return shiftsService.create({ ...data, tenantId } as any);
}

export async function updateShift(id: string, data: Partial<Shift>): Promise<Shift | null> {
  return shiftsService.update(id, data as any);
}

export async function deleteShift(id: string): Promise<boolean> {
  return shiftsService.delete(id);
}

// ── Weekly Offs ────────────────────────────────────────

export async function getWeeklyOffs(tenantId: string): Promise<WeeklyOff[]> {
  return weeklyOffsService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getWeeklyOffById(id: string): Promise<WeeklyOff | null> {
  return weeklyOffsService.findById(id);
}

export async function createWeeklyOff(tenantId: string, data: Partial<WeeklyOff>): Promise<WeeklyOff> {
  return weeklyOffsService.create({ ...data, tenantId } as any);
}

export async function updateWeeklyOff(id: string, data: Partial<WeeklyOff>): Promise<WeeklyOff | null> {
  return weeklyOffsService.update(id, data as any);
}

export async function deleteWeeklyOff(id: string): Promise<boolean> {
  return weeklyOffsService.delete(id);
}

// ── Attendance Records ─────────────────────────────────

export async function getAttendanceRecords(
  tenantId: string,
  options: {
    userId?: string;
    date?: string;
    fromDate?: Date;
    toDate?: Date;
    status?: string;
    limitCount?: number;
  } = {}
): Promise<EmployeeAttendance[]> {
  const where: { field: string; op: "==" | ">=" | "<="; value: unknown }[] = [];
  if (options.userId) where.push({ field: "userId", op: "==", value: options.userId });
  if (options.date) where.push({ field: "date", op: "==", value: options.date });
  if (options.status) where.push({ field: "status", op: "==", value: options.status });

  return attendanceService.findManyInTenant(tenantId, {
    where,
    orderByField: "date",
    orderByDirection: "desc",
    limitCount: options.limitCount || 500,
  });
}

export async function getAttendanceById(id: string): Promise<EmployeeAttendance | null> {
  return attendanceService.findById(id);
}

export async function markAttendance(
  tenantId: string,
  data: {
    userId: string;
    date: Date;
    checkIn?: Date;
    checkOut?: Date;
    shiftId?: string;
    workdayType?: EmployeeAttendance["workdayType"];
    source?: EmployeeAttendance["source"];
  }
): Promise<EmployeeAttendance> {
  // Use local date for consistency with what the UI shows
  const dateStr = data.date.getFullYear() + "-" +
    String(data.date.getMonth() + 1).padStart(2, "0") + "-" +
    String(data.date.getDate()).padStart(2, "0");

  // Check if user already has an attendance record for today
  const existing = await attendanceService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: data.userId },
      { field: "date", op: "==", value: dateStr },
    ],
    limitCount: 1,
  });

  if (existing.length > 0) {
    // Update existing record rather than creating a duplicate
    const record = existing[0];
    const updateData: Partial<EmployeeAttendance> = {};
    if (data.checkIn) updateData.checkIn = data.checkIn;
    if (data.checkOut) updateData.checkOut = data.checkOut;
    if (data.shiftId) updateData.shiftId = data.shiftId;
    if (data.workdayType) updateData.workdayType = data.workdayType;
    if (data.source) updateData.source = data.source;
    if (Object.keys(updateData).length > 0) {
      await attendanceService.update(record.id, updateData as any);
    }
    return { ...record, ...updateData } as EmployeeAttendance;
  }

  // Determine status
  let status: EmployeeAttendance["status"] = "present";
  if (data.workdayType === "weekly_off") status = "week_off";
  else if (data.workdayType === "holiday") status = "holiday";

  return attendanceService.create({
    ...data,
    date: dateStr as any,
    status,
    isLate: false,
    isEarlyDeparture: false,
    tenantId,
  } as any);
}

export async function updateAttendance(
  id: string,
  data: Partial<EmployeeAttendance>
): Promise<EmployeeAttendance | null> {
  return attendanceService.update(id, data as any);
}

export async function deleteAttendance(id: string): Promise<boolean> {
  return attendanceService.delete(id);
}

// ── Attendance Stats ───────────────────────────────────

export async function getAttendanceStats(
  tenantId: string,
  userId: string,
  month: number,
  year: number
): Promise<AttendanceStats | null> {
  const stats = await attendanceStatsService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "month", op: "==", value: month },
      { field: "year", op: "==", value: year },
    ],
    limitCount: 1,
  });
  return stats[0] || null;
}

export async function calculateAttendanceStats(
  tenantId: string,
  userId: string,
  month: number,
  year: number
): Promise<AttendanceStats> {
  const records = await attendanceService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
    ],
  });

  const stats: Partial<AttendanceStats> = {
    userId,
    tenantId,
    month,
    year,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    weeklyOffs: 0,
    holidays: 0,
    leaves: 0,
    overtimeHours: 0,
    totalWorkHours: 0,
  };

  for (const record of records) {
    const d = new Date(record.date as any);
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;

    switch (record.status) {
      case "present":
        stats.presentDays!++;
        if (record.isLate) stats.lateDays!++;
        break;
      case "absent":
        stats.absentDays!++;
        break;
      case "half_day":
        stats.halfDays!++;
        break;
      case "week_off":
        stats.weeklyOffs!++;
        break;
      case "holiday":
        stats.holidays!++;
        break;
      case "on_leave":
        stats.leaves!++;
        break;
    }

    if (record.totalHours) stats.totalWorkHours! += record.totalHours;
    if (record.overtimeHours) stats.overtimeHours! += record.overtimeHours;
  }

  const existing = await getAttendanceStats(tenantId, userId, month, year);
  if (existing) {
    await attendanceStatsService.update(existing.id, stats as any);
    return { ...existing, ...stats } as AttendanceStats;
  }

  return attendanceStatsService.create(stats as any);
}

// ── Regularization ─────────────────────────────────────

export async function getRegularizationRequests(
  tenantId: string,
  userId?: string,
  status?: RegularizationRequest["status"]
): Promise<RegularizationRequest[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (userId) where.push({ field: "userId", op: "==", value: userId });
  if (status) where.push({ field: "status", op: "==", value: status });

  return regularizationRequestsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createRegularizationRequest(
  tenantId: string,
  data: Partial<RegularizationRequest>
): Promise<RegularizationRequest> {
  return regularizationRequestsService.create({
    ...data,
    status: "pending",
    tenantId,
  } as any);
}

export async function reviewRegularizationRequest(
  id: string,
  status: "approved" | "rejected",
  reviewerId: string,
  notes?: string
): Promise<RegularizationRequest | null> {
  return regularizationRequestsService.update(id, {
    status,
    reviewedById: reviewerId,
    reviewedAt: new Date(),
    reviewerNotes: notes,
  } as any);
}

// ── Dashboard ──────────────────────────────────────────

export async function getAttendanceDashboard(
  tenantId: string,
  date: Date = new Date()
): Promise<{
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  total: number;
  percentage: number;
}> {
  // Convert Date to local date string for matching
  const dateStr = date.getFullYear() + "-" +
    String(date.getMonth() + 1).padStart(2, "0") + "-" +
    String(date.getDate()).padStart(2, "0");
  const records = await attendanceService.findManyInTenant(tenantId, {
    where: [{ field: "date", op: "==", value: dateStr }],
  });

  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.isLate).length;
  const onLeave = records.filter((r) => r.status === "on_leave").length;

  return {
    present,
    absent,
    late,
    onLeave,
    total,
    percentage: total > 0 ? Math.round((present / total) * 100) : 0,
  };
}
