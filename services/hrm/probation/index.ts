import "server-only";
import {
  probationPoliciesService,
  probationReviewsService,
} from "@/lib/hrm/firestore";
import type {
  ProbationPolicy,
  ProbationReview,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Probation Service
// ══════════════════════════════════════════════════════════════════

export async function getProbationPolicies(tenantId: string): Promise<ProbationPolicy[]> {
  return probationPoliciesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getProbationPolicyById(id: string): Promise<ProbationPolicy | null> {
  return probationPoliciesService.findById(id);
}

export async function createProbationPolicy(tenantId: string, data: Partial<ProbationPolicy>): Promise<ProbationPolicy> {
  return probationPoliciesService.create({ ...data, tenantId } as any);
}

export async function updateProbationPolicy(id: string, data: Partial<ProbationPolicy>): Promise<ProbationPolicy | null> {
  return probationPoliciesService.update(id, data as any);
}

export async function deleteProbationPolicy(id: string): Promise<boolean> {
  return probationPoliciesService.delete(id);
}

// ── Probation Reviews ──────────────────────────────────

export async function getProbationReviews(
  userId: string
): Promise<ProbationReview[]> {
  return probationReviewsService.findMany({
    where: [{ field: "userId", op: "==", value: userId }],
    orderByField: "reviewDate",
    orderByDirection: "desc",
  });
}

export async function getProbationReviewById(id: string): Promise<ProbationReview | null> {
  return probationReviewsService.findById(id);
}

export async function createProbationReview(
  tenantId: string,
  data: {
    userId: string;
    reviewNumber: number;
    reviewedById: string;
    rating: ProbationReview["rating"];
    comments: string;
    recommendation: ProbationReview["recommendation"];
  }
): Promise<ProbationReview> {
  return probationReviewsService.create({
    ...data,
    reviewDate: new Date(),
    status: "completed",
    tenantId,
  } as any);
}

export async function getDueProbationReviews(tenantId: string): Promise<ProbationReview[]> {
  // Get reviews that are still pending
  return probationReviewsService.findManyInTenant(tenantId, {
    where: [{ field: "status", op: "==", value: "pending" }],
  });
}

// ── Dashboard ──────────────────────────────────────────

export async function getProbationDashboard(tenantId: string): Promise<{
  activePolicies: number;
  dueReviews: number;
  confirmedLastMonth: number;
  extendedLastMonth: number;
}> {
  const [policies, reviews] = await Promise.all([
    getProbationPolicies(tenantId),
    getDueProbationReviews(tenantId),
  ]);

  return {
    activePolicies: policies.filter((p) => p.status === "active").length,
    dueReviews: reviews.length,
    confirmedLastMonth: 0,
    extendedLastMonth: 0,
  };
}
