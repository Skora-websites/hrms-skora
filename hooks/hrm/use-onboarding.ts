"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Onboarding, EmployeeOnboardingTask } from "@/types";

/**
 * Hook to fetch onboarding programs.
 */
export function useOnboardingPrograms(params?: Record<string, string>) {
  return useCollection<Onboarding>("/api/hrm/v2/onboarding", params);
}

/**
 * Hook to fetch a single onboarding program.
 */
export function useOnboardingProgram(id: string | null) {
  return useFirestoreQuery<Onboarding>(id ? `/api/hrm/v2/onboarding?id=${id}` : null);
}

/**
 * Hook to fetch employee onboarding tasks.
 */
export function useEmployeeOnboardingTasks(userId: string | null) {
  return useCollection<EmployeeOnboardingTask>(
    userId ? `/api/hrm/v2/onboarding?employeeTasks=true&userId=${userId}` : null
  );
}

/**
 * Hook to fetch the onboarding dashboard stats.
 */
export function useOnboardingDashboard() {
  return useFirestoreQuery<{
    totalPrograms: number;
    activeOnboardings: number;
    pendingTasks: number;
    overdueTasks: number;
  }>("/api/hrm/v2/onboarding?dashboard=true");
}
