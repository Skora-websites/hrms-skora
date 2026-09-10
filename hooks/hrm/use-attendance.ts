"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { EmployeeAttendance, AttendanceStats } from "@/types";

/**
 * Hook to fetch attendance records.
 */
export function useAttendance(params?: Record<string, string>) {
  return useCollection<EmployeeAttendance>("/api/hrm/v2/attendance", params);
}

/**
 * Hook to fetch attendance stats for a user.
 */
export function useAttendanceStats(
  userId: string | null,
  month?: number,
  year?: number
) {
  const params = new URLSearchParams();
  if (month) params.set("month", month.toString());
  if (year) params.set("year", year.toString());
  const queryString = params.toString();

  return useFirestoreQuery<AttendanceStats>(
    userId ? `/api/hrm/v2/attendance/stats/${userId}${queryString ? `?${queryString}` : ""}` : null
  );
}
