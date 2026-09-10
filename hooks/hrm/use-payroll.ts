"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { PayGroup, PayrollRun, PayrollTransaction } from "@/types";

/**
 * Hook to fetch pay groups.
 */
export function usePayGroups() {
  return useCollection<PayGroup>("/api/hrm/v2/payroll/pay-groups");
}

/**
 * Hook to fetch payroll runs.
 */
export function usePayrollRuns(params?: Record<string, string>) {
  return useCollection<PayrollRun>("/api/hrm/v2/payroll/runs", params);
}

/**
 * Hook to fetch a single payroll run.
 */
export function usePayrollRun(id: string | null) {
  return useFirestoreQuery<PayrollRun>(id ? `/api/hrm/v2/payroll/runs/${id}` : null);
}

/**
 * Hook to fetch payroll transactions for a user.
 */
export function useEmployeePayroll(userId: string | null) {
  return useCollection<PayrollTransaction>(
    userId ? `/api/hrm/v2/payroll/transactions?userId=${userId}` : null
  );
}
