"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Holiday, HolidayPlan, CalendarEvent } from "@/types";

/**
 * Hook to fetch holidays.
 */
export function useHolidays(params?: Record<string, string>) {
  return useCollection<Holiday>("/api/hrm/v2/holidays", params);
}

/**
 * Hook to fetch a single holiday.
 */
export function useHoliday(id: string | null) {
  return useFirestoreQuery<Holiday>(id ? `/api/hrm/v2/holidays?id=${id}` : null);
}

/**
 * Hook to fetch holiday plans.
 */
export function useHolidayPlans(params?: Record<string, string>) {
  return useCollection<HolidayPlan>("/api/hrm/v2/holidays?type=plans", params);
}

/**
 * Hook to fetch the holiday dashboard stats.
 */
export function useHolidayDashboard() {
  return useFirestoreQuery<{
    totalPlans: number;
    holidaysThisYear: number;
    upcomingHolidays: number;
  }>("/api/hrm/v2/holidays?dashboard=true");
}

/**
 * Hook to fetch calendar events.
 */
export function useCalendarEvents(fromDate: string, toDate: string) {
  return useCollection<CalendarEvent>(
    `/api/hrm/v2/holidays?type=calendar&calendar=${fromDate},${toDate}`
  );
}
