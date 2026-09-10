import "server-only";
import {
  goalsService,
  performanceReviewsService,
  performanceFeedbackService,
  kpisService,
} from "@/lib/hrm/firestore";
import { recordAuditLog } from "@/services/hrm/audit";
import type { Goal, PerformanceReview, PerformanceFeedback, Kpi } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Performance Module Service
// ══════════════════════════════════════════════════════════════════

// ── Goals ─────────────────────────────────────────────

export async function getGoals(tenantId: string, userId?: string): Promise<Goal[]> {
  if (userId) {
    return goalsService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
      orderByField: "createdAt",
      orderByDirection: "desc",
    });
  }
  return goalsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getGoalById(id: string): Promise<Goal | null> {
  return goalsService.findById(id);
}

export async function createGoal(
  data: Omit<Goal, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<Goal> {
  return goalsService.create(data as any);
}

export async function updateGoal(
  id: string,
  data: Partial<Goal>
): Promise<Goal | null> {
  return goalsService.update(id, data as any);
}

export async function deleteGoal(id: string): Promise<boolean> {
  return goalsService.delete(id);
}

// ── Performance Reviews ───────────────────────────────

export async function getReviews(
  tenantId: string,
  userId?: string
): Promise<PerformanceReview[]> {
  if (userId) {
    return performanceReviewsService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
      orderByField: "createdAt",
      orderByDirection: "desc",
    });
  }
  return performanceReviewsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getReviewById(id: string): Promise<PerformanceReview | null> {
  return performanceReviewsService.findById(id);
}

export async function createReview(
  data: Omit<PerformanceReview, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<PerformanceReview> {
  return performanceReviewsService.create(data as any);
}

export async function updateReview(
  id: string,
  data: Partial<PerformanceReview>
): Promise<PerformanceReview | null> {
  return performanceReviewsService.update(id, data as any);
}

export async function deleteReview(id: string): Promise<boolean> {
  return performanceReviewsService.delete(id);
}

// ── Feedback ──────────────────────────────────────────

export async function getFeedback(
  tenantId: string,
  userId?: string
): Promise<PerformanceFeedback[]> {
  if (userId) {
    return performanceFeedbackService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
      orderByField: "createdAt",
      orderByDirection: "desc",
    });
  }
  return performanceFeedbackService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createFeedback(
  data: Omit<PerformanceFeedback, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<PerformanceFeedback> {
  return performanceFeedbackService.create(data as any);
}

export async function updateFeedback(
  id: string,
  data: Partial<PerformanceFeedback>
): Promise<PerformanceFeedback | null> {
  return performanceFeedbackService.update(id, data as any);
}

export async function deleteFeedback(id: string): Promise<boolean> {
  return performanceFeedbackService.delete(id);
}

// ── KPIs ──────────────────────────────────────────────

export async function getKpis(
  tenantId: string,
  userId?: string
): Promise<Kpi[]> {
  if (userId) {
    return kpisService.findManyInTenant(tenantId, {
      where: [{ field: "userId", op: "==", value: userId }],
      orderByField: "createdAt",
      orderByDirection: "desc",
    });
  }
  return kpisService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getKpiById(id: string): Promise<Kpi | null> {
  return kpisService.findById(id);
}

export async function createKpi(
  data: Omit<Kpi, "id" | "tenantId" | "createdAt" | "updatedAt">
): Promise<Kpi> {
  return kpisService.create(data as any);
}

export async function updateKpi(
  id: string,
  data: Partial<Kpi>
): Promise<Kpi | null> {
  return kpisService.update(id, data as any);
}

export async function deleteKpi(id: string): Promise<boolean> {
  return kpisService.delete(id);
}

// ── Dashboard Stats ──────────────────────────────────

export interface PerformanceDashboardStats {
  totalGoals: number;
  achievedGoals: number;
  activeReviews: number;
  completedReviews: number;
  averageKpiScore: number;
  pendingFeedback: number;
}

export async function getDashboardStats(
  tenantId: string,
  userId?: string
): Promise<PerformanceDashboardStats> {
  const goals = await getGoals(tenantId, userId);
  const reviews = await getReviews(tenantId, userId);
  const feedback = await getFeedback(tenantId, userId);
  const kpis = await getKpis(tenantId, userId);

  return {
    totalGoals: goals.length,
    achievedGoals: goals.filter((g) => g.status === "achieved").length,
    activeReviews: reviews.filter((r) => r.status === "submitted" || r.status === "draft").length,
    completedReviews: reviews.filter((r) => r.status === "completed").length,
    averageKpiScore: kpis.length > 0
      ? Math.round(kpis.reduce((sum, k) => sum + (k.actual / k.target) * 100, 0) / kpis.length)
      : 0,
    pendingFeedback: feedback.filter((f) => f.status === "pending").length,
  };
}
