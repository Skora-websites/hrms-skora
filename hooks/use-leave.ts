"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { LeaveRequest, LeaveBalance, LeaveType } from "@/types";

/**
 * Hook to fetch leave requests.
 */
export function useLeaves(params?: Record<string, string>) {
  return useCollection<LeaveRequest>("/api/hrm/v2/leaves", params);
}

/**
 * Hook to fetch leave balances for a user.
 */
export function useLeaveBalances(userId: string | null) {
  return useCollection<LeaveBalance>(
    userId ? "/api/hrm/v2/leaves" : null,
    userId ? { type: "balances", userId } : undefined
  );
}

/**
 * Hook to fetch leave types.
 */
export function useLeaveTypes(params?: Record<string, string>) {
  return useCollection<LeaveType>("/api/hrm/v2/leaves", {
    type: "types",
    ...params,
  });
}
