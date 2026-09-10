"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Organization, Department, Designation } from "@/types";

/**
 * Hook to fetch organizations.
 */
export function useOrganizations(params?: Record<string, string>) {
  return useCollection<Organization>("/api/hrm/v2/organizations", params);
}

/**
 * Hook to fetch departments.
 */
export function useDepartments(params?: Record<string, string>) {
  return useCollection<Department>("/api/hrm/v2/organizations/departments", params);
}

/**
 * Hook to fetch designations.
 */
export function useDesignations(params?: Record<string, string>) {
  return useCollection<Designation>("/api/hrm/v2/organizations/designations", params);
}
