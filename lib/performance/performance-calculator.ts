export interface PerformanceUser {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  avatar?: string;
  employeeId?: string;
}

export interface GoalItem {
  id: string;
  title: string;
  userId?: string;
  category: string;
  status: string;
  priority: string;
  progress: number;
  targetDate?: string;
  createdAt?: string;
  description?: string;
}

export interface ReviewScore {
  category: string;
  score: number;
  comments?: string;
}

export interface ReviewItem {
  id: string;
  userId?: string;
  reviewerId?: string;
  reviewType?: string;
  period?: string;
  overallRating?: number;
  scores?: ReviewScore[];
  strengths?: string;
  areasForImprovement?: string;
  managerComments?: string;
  status: string;
  createdAt?: string;
}

export interface KpiItem {
  id: string;
  userId?: string;
  name?: string;
  title?: string;
  category?: string;
  target: number;
  actual: number;
  unit: string;
  weight?: number;
  period?: string;
  status?: string;
}

export interface FeedbackItem {
  id: string;
  userId?: string;
  fromUserId?: string;
  feedbackType?: string;
  type?: string;
  rating?: number;
  message?: string;
  feedback?: string;
  context?: string;
  isAnonymous?: boolean;
  status?: string;
  createdAt?: string;
}

export type PerformanceTier =
  | "Top Performer"
  | "Strong Performer"
  | "On Track"
  | "Needs Guidance"
  | "Pending Evaluation";

export interface EmployeePerformanceSummary {
  user: PerformanceUser;
  compositeScore: number | null; // 0-100 or null if no data
  compositeRating: number | null; // 0-5.0 or null
  tier: PerformanceTier;
  goals: GoalItem[];
  goalsCount: number;
  goalsAchievedCount: number;
  avgGoalProgress: number | null;
  reviews: ReviewItem[];
  reviewsCount: number;
  avgReviewRating: number | null;
  latestReviewRating: number | null;
  kpis: KpiItem[];
  kpisCount: number;
  avgKpiAchievement: number | null;
  feedbacks: FeedbackItem[];
  feedbackCount: number;
  avgFeedbackRating: number | null;
}

export interface TeamPerformanceOverview {
  totalEmployees: number;
  evaluatedEmployees: number;
  averageCompositeScore: number;
  averageRating: number;
  topPerformersCount: number;
  strongPerformersCount: number;
  onTrackCount: number;
  needsGuidanceCount: number;
  pendingCount: number;
  totalGoals: number;
  achievedGoals: number;
  totalReviews: number;
  completedReviews: number;
  totalKpis: number;
  totalFeedbacks: number;
  tierDistribution: { tier: string; count: number; color: string }[];
  departmentBreakdown: { department: string; avgScore: number; count: number }[];
}

/**
 * Calculates individual employee performance summaries given raw collections.
 */
export function calculateEmployeePerformance(
  users: PerformanceUser[],
  goals: GoalItem[],
  reviews: ReviewItem[],
  kpis: KpiItem[],
  feedbacks: FeedbackItem[]
): EmployeePerformanceSummary[] {
  // Index collections by userId
  const goalsByUser = new Map<string, GoalItem[]>();
  const reviewsByUser = new Map<string, ReviewItem[]>();
  const kpisByUser = new Map<string, KpiItem[]>();
  const feedbackByUser = new Map<string, FeedbackItem[]>();

  for (const g of goals) {
    if (!g.userId) continue;
    const list = goalsByUser.get(g.userId) || [];
    list.push(g);
    goalsByUser.set(g.userId, list);
  }

  for (const r of reviews) {
    if (!r.userId) continue;
    const list = reviewsByUser.get(r.userId) || [];
    list.push(r);
    reviewsByUser.set(r.userId, list);
  }

  for (const k of kpis) {
    if (!k.userId) continue;
    const list = kpisByUser.get(k.userId) || [];
    list.push(k);
    kpisByUser.set(k.userId, list);
  }

  for (const f of feedbacks) {
    if (!f.userId) continue;
    const list = feedbackByUser.get(f.userId) || [];
    list.push(f);
    feedbackByUser.set(f.userId, list);
  }

  return users.map((user) => {
    const userGoals = goalsByUser.get(user.id) || [];
    const userReviews = reviewsByUser.get(user.id) || [];
    const userKpis = kpisByUser.get(user.id) || [];
    const userFeedbacks = feedbackByUser.get(user.id) || [];

    // 1. Goal Progress
    const goalsAchievedCount = userGoals.filter(
      (g) => g.status === "achieved" || g.progress >= 100
    ).length;
    const avgGoalProgress =
      userGoals.length > 0
        ? Math.round(
            userGoals.reduce((sum, g) => sum + Math.min(Math.max(g.progress || 0, 0), 100), 0) /
              userGoals.length
          )
        : null;

    // 2. Review Ratings
    const validReviews = userReviews.filter(
      (r) => typeof r.overallRating === "number" && r.overallRating > 0
    );
    const avgReviewRating =
      validReviews.length > 0
        ? Number(
            (
              validReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0) /
              validReviews.length
            ).toFixed(1)
          )
        : null;
    const latestReviewRating =
      validReviews.length > 0 ? validReviews[0].overallRating || null : null;

    // Review score out of 100
    const reviewPct = avgReviewRating !== null ? (avgReviewRating / 5) * 100 : null;

    // 3. KPI Achievement
    const avgKpiAchievement =
      userKpis.length > 0
        ? Math.round(
            userKpis.reduce((sum, k) => {
              const target = Number(k.target) || 1;
              const actual = Number(k.actual) || 0;
              const pct = (actual / Math.max(target, 0.001)) * 100;
              return sum + Math.min(Math.max(pct, 0), 120);
            }, 0) / userKpis.length
          )
        : null;
    const kpiPct =
      avgKpiAchievement !== null ? Math.min(avgKpiAchievement, 100) : null;

    // 4. Feedback metrics
    const ratedFeedback = userFeedbacks.filter(
      (f) => typeof f.rating === "number" && (f.rating as number) > 0
    );
    const avgFeedbackRating =
      ratedFeedback.length > 0
        ? Number(
            (
              ratedFeedback.reduce((s, f) => s + (f.rating || 0), 0) /
              ratedFeedback.length
            ).toFixed(1)
          )
        : null;

    // 5. Composite Score Calculation with dynamic weights
    let compositeScore: number | null = null;
    const components: { score: number; weight: number }[] = [];

    if (avgGoalProgress !== null) {
      components.push({ score: avgGoalProgress, weight: 0.3 });
    }
    if (reviewPct !== null) {
      components.push({ score: reviewPct, weight: 0.4 });
    }
    if (kpiPct !== null) {
      components.push({ score: kpiPct, weight: 0.3 });
    }

    if (components.length > 0) {
      const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
      const weightedSum = components.reduce((sum, c) => sum + c.score * c.weight, 0);
      compositeScore = Math.round(weightedSum / totalWeight);
    }

    const compositeRating =
      compositeScore !== null ? Number(((compositeScore / 100) * 5).toFixed(1)) : null;

    // 6. Tier assignment
    let tier: PerformanceTier = "Pending Evaluation";
    if (compositeScore !== null) {
      if (compositeScore >= 90) tier = "Top Performer";
      else if (compositeScore >= 75) tier = "Strong Performer";
      else if (compositeScore >= 60) tier = "On Track";
      else tier = "Needs Guidance";
    }

    return {
      user,
      compositeScore,
      compositeRating,
      tier,
      goals: userGoals,
      goalsCount: userGoals.length,
      goalsAchievedCount,
      avgGoalProgress,
      reviews: userReviews,
      reviewsCount: userReviews.length,
      avgReviewRating,
      latestReviewRating,
      kpis: userKpis,
      kpisCount: userKpis.length,
      avgKpiAchievement,
      feedbacks: userFeedbacks,
      feedbackCount: userFeedbacks.length,
      avgFeedbackRating,
    };
  });
}

/**
 * Computes high level overview metrics for the entire team/organization.
 */
export function calculateTeamOverview(
  summaries: EmployeePerformanceSummary[]
): TeamPerformanceOverview {
  const totalEmployees = summaries.length;
  const evaluated = summaries.filter((s) => s.compositeScore !== null);
  const evaluatedEmployees = evaluated.length;

  const averageCompositeScore =
    evaluatedEmployees > 0
      ? Math.round(
          evaluated.reduce((sum, s) => sum + (s.compositeScore || 0), 0) /
            evaluatedEmployees
        )
      : 0;

  const averageRating =
    evaluatedEmployees > 0
      ? Number(((averageCompositeScore / 100) * 5).toFixed(1))
      : 0;

  let topPerformersCount = 0;
  let strongPerformersCount = 0;
  let onTrackCount = 0;
  let needsGuidanceCount = 0;
  let pendingCount = 0;

  let totalGoals = 0;
  let achievedGoals = 0;
  let totalReviews = 0;
  let completedReviews = 0;
  let totalKpis = 0;
  let totalFeedbacks = 0;

  const deptMap = new Map<string, { totalScore: number; count: number }>();

  for (const s of summaries) {
    if (s.tier === "Top Performer") topPerformersCount++;
    else if (s.tier === "Strong Performer") strongPerformersCount++;
    else if (s.tier === "On Track") onTrackCount++;
    else if (s.tier === "Needs Guidance") needsGuidanceCount++;
    else pendingCount++;

    totalGoals += s.goalsCount;
    achievedGoals += s.goalsAchievedCount;
    totalReviews += s.reviewsCount;
    completedReviews += s.reviews.filter((r) => r.status === "completed").length;
    totalKpis += s.kpisCount;
    totalFeedbacks += s.feedbackCount;

    const dept = s.user.department || "General";
    if (s.compositeScore !== null) {
      const entry = deptMap.get(dept) || { totalScore: 0, count: 0 };
      entry.totalScore += s.compositeScore;
      entry.count += 1;
      deptMap.set(dept, entry);
    }
  }

  const tierDistribution = [
    { tier: "Top Performer", count: topPerformersCount, color: "#10b981" },
    { tier: "Strong Performer", count: strongPerformersCount, color: "#3b82f6" },
    { tier: "On Track", count: onTrackCount, color: "#f59e0b" },
    { tier: "Needs Guidance", count: needsGuidanceCount, color: "#f43f5e" },
    { tier: "Pending Evaluation", count: pendingCount, color: "#94a3b8" },
  ];

  const departmentBreakdown = Array.from(deptMap.entries()).map(([department, data]) => ({
    department,
    avgScore: Math.round(data.totalScore / data.count),
    count: data.count,
  }));

  return {
    totalEmployees,
    evaluatedEmployees,
    averageCompositeScore,
    averageRating,
    topPerformersCount,
    strongPerformersCount,
    onTrackCount,
    needsGuidanceCount,
    pendingCount,
    totalGoals,
    achievedGoals,
    totalReviews,
    completedReviews,
    totalKpis,
    totalFeedbacks,
    tierDistribution,
    departmentBreakdown,
  };
}
