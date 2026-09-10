"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { EmployeeExit, EmployeeExitSetting, NoticePeriod } from "@/types";

/**
 * Hook to fetch exit records.
 */
export function useExits(params?: Record<string, string>) {
  return useCollection<EmployeeExit>("/api/hrm/v2/exit", params);
}

/**
 * Hook to fetch a single exit record.
 */
export function useExit(id: string | null) {
  return useFirestoreQuery<EmployeeExit>(id ? `/api/hrm/v2/exit?id=${id}` : null);
}

/**
 * Hook to fetch exit settings.
 */
export function useExitSettings() {
  return useFirestoreQuery<EmployeeExitSetting>("/api/hrm/v2/exit?settings=true");
}

/**
 * Hook to fetch a notice period for a user.
 */
export function useNoticePeriod(userId: string | null) {
  return useFirestoreQuery<NoticePeriod>(
    userId ? `/api/hrm/v2/exit?noticePeriod=true&userId=${userId}` : null
  );
}

/**
 * Hook to fetch the exit dashboard stats.
 */
export function useExitDashboard() {
  return useFirestoreQuery<{
    totalExits: number;
    pendingClearance: number;
    noticePeriodActive: number;
    completedThisMonth: number;
  }>("/api/hrm/v2/exit?dashboard=true");
}
