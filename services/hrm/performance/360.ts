import "server-only";
import {
  performance360ReviewsService,
  hrmUsersService,
  notificationsService,
} from "@/lib/hrm/firestore";
import type { Performance360Review } from "@/types";

// ══════════════════════════════════════════════════════════════════
// 360-Degree Multi-Rater Performance Review Engine
// ══════════════════════════════════════════════════════════════════

export const STANDARD_360_COMPETENCIES = [
  { key: "leadership", label: "Strategic Leadership & Vision" },
  { key: "technical_competence", label: "Functional & Technical Excellence" },
  { key: "communication", label: "Communication & Stakeholder Influence" },
  { key: "teamwork", label: "Collaboration & Team Culture" },
  { key: "ownership", label: "Accountability & Execution Speed" },
  { key: "innovation", label: "Problem Solving & Innovation" },
];

export async function initiate360ReviewCycle(
  tenantId: string = "default",
  employeeId: string,
  reviewCycle: string = "Annual-2026",
  raters: Array<{ reviewerId: string; relationship: Performance360Review["relationship"] }>
): Promise<Performance360Review[]> {
  const employee = await hrmUsersService.findById(employeeId);
  const employeeName = employee ? (employee.displayName || (employee as any).name || employee.email) : "Colleague";

  const createdReviews: Performance360Review[] = [];

  for (const rater of raters) {
    const reviewer = await hrmUsersService.findById(rater.reviewerId);
    const reviewerName = reviewer ? (reviewer.displayName || (reviewer as any).name || reviewer.email) : "Colleague";

    const review = await performance360ReviewsService.createInTenant(tenantId, {
      employeeId,
      employeeName,
      reviewerId: rater.reviewerId,
      reviewerName,
      relationship: rater.relationship,
      reviewCycle,
      ratings: {},
      overallRating: 0,
      status: "pending",
    });

    createdReviews.push(review);

    // Notify reviewer
    await notificationsService.createInTenant(tenantId, {
      userId: rater.reviewerId,
      title: `360 Feedback Requested for ${employeeName}`,
      body: `You have been requested to provide 360-degree performance feedback for ${employeeName} (${rater.relationship}) for cycle ${reviewCycle}.`,
      type: "general",
      isRead: false,
    }).catch(() => {});
  }

  return createdReviews;
}

export async function get360ReviewsForReviewer(
  tenantId: string = "default",
  reviewerId: string,
  status?: Performance360Review["status"]
): Promise<Performance360Review[]> {
  const where: any[] = [{ field: "reviewerId", op: "==", value: reviewerId }];
  if (status) {
    where.push({ field: "status", op: "==", value: status });
  }

  return performance360ReviewsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function get360ReviewsForEmployee(
  tenantId: string = "default",
  employeeId: string,
  reviewCycle?: string
): Promise<Performance360Review[]> {
  const where: any[] = [{ field: "employeeId", op: "==", value: employeeId }];
  if (reviewCycle) {
    where.push({ field: "reviewCycle", op: "==", value: reviewCycle });
  }

  return performance360ReviewsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function submit360Feedback(
  reviewId: string,
  reviewerId: string,
  data: {
    ratings: Record<string, number>;
    feedbackStrengths?: string;
    feedbackImprovements?: string;
  }
): Promise<Performance360Review> {
  const review = await performance360ReviewsService.findById(reviewId);
  if (!review) throw new Error("360 Review record not found");
  if (review.reviewerId !== reviewerId) throw new Error("Unauthorized to submit feedback for this review");

  const ratingValues = Object.values(data.ratings).filter((v) => typeof v === "number" && v > 0);
  const overallRating = ratingValues.length > 0
    ? Number((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1))
    : 0;

  const updated = await performance360ReviewsService.update(reviewId, {
    ratings: data.ratings,
    feedbackStrengths: data.feedbackStrengths || "",
    feedbackImprovements: data.feedbackImprovements || "",
    overallRating,
    status: "completed",
  });

  return updated!;
}

// ── Multi-Rater Aggregate 360 Summary ─────────────────────────────

export interface Summary360Report {
  employeeId: string;
  employeeName: string;
  reviewCycle: string;
  totalRaters: number;
  completedRaters: number;
  overallScore: number;
  isAnonymityProtected: boolean;
  anonymityThreshold: number;
  scoresByRelationship: {
    self?: number;
    manager?: number;
    peer?: number;
    direct_report?: number;
    colleagues?: number;
  };
  competencyBreakdown: Array<{
    key: string;
    label: string;
    selfScore: number;
    othersAverageScore: number;
    gap: number;
  }>;
  qualitativeStrengths: string[];
  qualitativeImprovements: string[];
}

export async function calculate360SummaryReport(
  tenantId: string = "default",
  employeeId: string,
  reviewCycle: string = "Annual-2026"
): Promise<Summary360Report> {
  const reviews = await get360ReviewsForEmployee(tenantId, employeeId, reviewCycle);
  const employee = await hrmUsersService.findById(employeeId);
  const employeeName = employee?.displayName || (employee as any)?.name || "Employee";

  const completed = reviews.filter((r) => r.status === "completed");

  const selfReview = completed.find((r) => r.relationship === "self");
  const managerReviews = completed.filter((r) => r.relationship === "manager");
  const peerReviews = completed.filter((r) => r.relationship === "peer");
  const directReports = completed.filter((r) => r.relationship === "direct_report");

  const avg = (arr: Performance360Review[]) =>
    arr.length > 0 ? Number((arr.reduce((s, r) => s + (r.overallRating || 0), 0) / arr.length).toFixed(1)) : undefined;

  const managerScore = avg(managerReviews);
  const selfScore = selfReview ? selfReview.overallRating : undefined;

  const others = completed.filter((r) => r.relationship !== "self");
  const overallScore = others.length > 0
    ? Number((others.reduce((s, r) => s + (r.overallRating || 0), 0) / others.length).toFixed(1))
    : (selfScore || 0);

  // ── k-Anonymity Shield (k >= 3) ──────────────────────────────────
  // If fewer than 3 peers or direct reports completed reviews, merge their buckets
  // to protect anonymity and prevent retaliation.
  const ANONYMITY_THRESHOLD = 3;
  let isAnonymityProtected = false;
  const scoresByRelationship: Summary360Report["scoresByRelationship"] = {
    self: selfScore,
    manager: managerScore,
  };

  const peerCount = peerReviews.length;
  const directCount = directReports.length;

  if (peerCount >= ANONYMITY_THRESHOLD && directCount >= ANONYMITY_THRESHOLD) {
    // Both meet k-anonymity; safe to show separately
    scoresByRelationship.peer = avg(peerReviews);
    scoresByRelationship.direct_report = avg(directReports);
  } else if (peerCount + directCount >= ANONYMITY_THRESHOLD) {
    // Individually below threshold, but combined >= 3: merge into "colleagues"
    isAnonymityProtected = true;
    scoresByRelationship.colleagues = avg([...peerReviews, ...directReports]);
  } else {
    // Total non-manager raters < 3: completely suppress granular relationship breakdowns
    isAnonymityProtected = true;
    if (peerCount + directCount > 0) {
      scoresByRelationship.colleagues = avg([...peerReviews, ...directReports]);
    }
  }

  // Competency breakdown
  const competencyBreakdown = STANDARD_360_COMPETENCIES.map((comp) => {
    const selfVal = selfReview?.ratings?.[comp.key] || 0;
    const otherVals = others.map((r) => r.ratings?.[comp.key]).filter((v) => typeof v === "number" && v > 0);
    const othersAvg = otherVals.length > 0
      ? Number((otherVals.reduce((a, b) => a + b, 0) / otherVals.length).toFixed(1))
      : 0;

    return {
      key: comp.key,
      label: comp.label,
      selfScore: selfVal,
      othersAverageScore: othersAvg,
      gap: Number((selfVal - othersAvg).toFixed(1)),
    };
  });

  // Extract qualitative feedback and shuffle to scramble author correlation
  const qualitativeStrengths: string[] = [];
  const qualitativeImprovements: string[] = [];

  completed.forEach((r) => {
    if (r.feedbackStrengths?.trim()) qualitativeStrengths.push(r.feedbackStrengths.trim());
    if (r.feedbackImprovements?.trim()) qualitativeImprovements.push(r.feedbackImprovements.trim());
  });

  // Shuffle text feedback (Knuth-Fisher-Yates) to strip submission sequence order
  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  return {
    employeeId,
    employeeName,
    reviewCycle,
    totalRaters: reviews.length,
    completedRaters: completed.length,
    overallScore,
    isAnonymityProtected,
    anonymityThreshold: ANONYMITY_THRESHOLD,
    scoresByRelationship,
    competencyBreakdown,
    qualitativeStrengths: shuffle(qualitativeStrengths),
    qualitativeImprovements: shuffle(qualitativeImprovements),
  };
}
