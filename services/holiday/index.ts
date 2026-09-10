import "server-only";
import {
  holidaysService,
  holidayPlansService,
  calendarEventsService,
} from "@/lib/hrm/firestore";
import type {
  Holiday,
  HolidayPlan,
  CalendarEvent,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Holiday Service
// ══════════════════════════════════════════════════════════════════

export async function getHolidayPlans(tenantId: string): Promise<HolidayPlan[]> {
  return holidayPlansService.findManyInTenant(tenantId, {
    orderByField: "year",
    orderByDirection: "desc",
  });
}

export async function getHolidayPlanById(id: string): Promise<HolidayPlan | null> {
  return holidayPlansService.findById(id);
}

export async function createHolidayPlan(tenantId: string, data: Partial<HolidayPlan>): Promise<HolidayPlan> {
  return holidayPlansService.create({ ...data, tenantId } as any);
}

export async function updateHolidayPlan(id: string, data: Partial<HolidayPlan>): Promise<HolidayPlan | null> {
  return holidayPlansService.update(id, data as any);
}

export async function deleteHolidayPlan(id: string): Promise<boolean> {
  return holidayPlansService.delete(id);
}

// ── Holidays ───────────────────────────────────────────

export async function getHolidays(
  tenantId: string,
  planId?: string,
  year?: number
): Promise<Holiday[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (planId) where.push({ field: "planId", op: "==", value: planId });
  if (year) where.push({ field: "year", op: "==", value: year });

  return holidaysService.findManyInTenant(tenantId, {
    where,
    orderByField: "date",
    orderByDirection: "asc",
  });
}

export async function getHolidayById(id: string): Promise<Holiday | null> {
  return holidaysService.findById(id);
}

export async function createHoliday(tenantId: string, data: Partial<Holiday>): Promise<Holiday> {
  // Extract year from date for filtering/listing purposes.
  // Convert date string to Date so Firestore stores it as a Timestamp,
  // not a string — this ensures proper sorting in queries.
  let year: number | undefined;
  if (data.date) {
    const d = data.date instanceof Date ? data.date : new Date(data.date as any);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      data.date = d as any;
    }
  }

  // Build payload carefully — avoid spreading undefined year,
  // which would cause Firestore Admin SDK to throw on set().
  const payload: Record<string, unknown> = {
    ...data,
    tenantId,
    isOptional: data.isOptional ?? false,
  };
  if (year !== undefined) payload.year = year;

  return holidaysService.create(payload as any);
}

export async function updateHoliday(id: string, data: Partial<Holiday>): Promise<Holiday | null> {
  return holidaysService.update(id, data as any);
}

export async function deleteHoliday(id: string): Promise<boolean> {
  return holidaysService.delete(id);
}

// ── Public Holidays (no tenant) ────────────────────────

export async function getPublicHolidays(year?: number): Promise<Holiday[]> {
  const y = year || new Date().getFullYear();
  // Public holidays are stored without tenantId or in a global collection
  return holidaysService.findMany({
    where: [
      { field: "year", op: "==", value: y },
    ],
    orderByField: "date",
    orderByDirection: "asc",
  });
}

// ── Calendar Events ────────────────────────────────────

export async function getCalendarEvents(
  tenantId: string,
  userId: string,
  fromDate: Date,
  toDate: Date
): Promise<CalendarEvent[]> {
  return calendarEventsService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "date", op: ">=", value: fromDate },
      { field: "date", op: "<=", value: toDate },
    ],
    orderByField: "date",
    orderByDirection: "asc",
  });
}

export async function createCalendarEvent(
  tenantId: string,
  data: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  return calendarEventsService.create({ ...data, tenantId } as any);
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  return calendarEventsService.delete(id);
}

// ── Dashboard ──────────────────────────────────────────

export async function getHolidayDashboard(tenantId: string): Promise<{
  totalPlans: number;
  holidaysThisYear: number;
  upcomingHolidays: number;
}> {
  const currentYear = new Date().getFullYear();
  const [plans, holidays] = await Promise.all([
    getHolidayPlans(tenantId),
    getHolidays(tenantId, undefined, currentYear),
  ]);

  const today = new Date();
  const upcoming = holidays.filter((h) => new Date(h.date as any) >= today);

  return {
    totalPlans: plans.length,
    holidaysThisYear: holidays.length,
    upcomingHolidays: upcoming.length,
  };
}
