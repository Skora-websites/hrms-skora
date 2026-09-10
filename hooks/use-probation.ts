"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { ProbationPolicy, ProbationReview } from "@/types";

/**
 * Hook to fetch probation policies.
 */
export function useProbationPolicies(params?: Record<string, string>) {
  return useCollection<ProbationPolicy>("/api/hrm/v2/probation", params);
}

/**
 * Hook to fetch a single probation policy.
 */
export function useProbationPolicy(id: string | null) {
  return useFirestoreQuery<ProbationPolicy>(id ? `/api/hrm/v2/probation?id=${id}` : null);
}

/**
 * Hook to fetch probation reviews for a user.
 */
export function useProbationReviews(userId: string | null) {
  return useCollection<ProbationReview>(
    userId ? `/api/hrm/v2/probation?type=reviews&userId=${userId}` : null
  );
}

/**
 * Hook to fetch the probation dashboard stats.
 */
export function useProbationDashboard() {
  return useFirestoreQuery<{
    activePolicies: number;
    dueReviews: number;
    confirmedLastMonth: number;
    extendedLastMonth: number;
  }>("/api/hrm/v2/probation?dashboard=true");
}
