"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { HRMUser, EmployeeProfile } from "@/types";

/**
 * Hook to fetch all employees.
 */
export function useEmployees(
  params?: Record<string, string>
) {
  return useCollection<HRMUser>("/api/hrm/v2/employees", params);
}

/**
 * Hook to fetch a single employee.
 */
export function useEmployee(id: string | null) {
  return useFirestoreQuery<HRMUser>(
    id ? `/api/hrm/v2/employees?id=${id}` : null
  );
}

/**
 * Hook to fetch an employee's full profile.
 */
export function useEmployeeProfile(id: string | null) {
  return useFirestoreQuery<EmployeeProfile>(
    id ? `/api/hrm/v2/employees?id=${id}&profile=true` : null
  );
}
