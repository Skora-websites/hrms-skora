import { NextRequest, NextResponse } from "next/server";
import {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getDashboardStats,
  getFeedback,
  getKpis,
  deleteFeedback,
  deleteKpi,
} from "@/services/hrm/performance";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound } from "@/lib/api-handler";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const dashboard = searchParams.get("dashboard") === "true";

  // Dashboard stats
  if (dashboard) {
    const stats = await getDashboardStats(tenantId, userId || undefined);
    return NextResponse.json({ data: stats });
  }

  // Goals
  if (type === "goals" || !type) {
    if (id) {
      const goal = await getGoalById(id);
      if (!goal) return notFound("Goal not found");
      return NextResponse.json({ data: goal });
    }
    const goals = await getGoals(tenantId, userId || undefined);
    // Filter for employee role
    const filtered = auth.role === "employee" && userId
      ? goals.filter((g) => g.userId === auth.userId)
      : goals;
    return NextResponse.json({ data: filtered });
  }

  // Reviews
  if (type === "reviews") {
    if (id) {
      const review = await getReviewById(id);
      if (!review) return notFound("Review not found");
      return NextResponse.json({ data: review });
    }
    const reviews = await getReviews(tenantId, userId || undefined);
    return NextResponse.json({ data: reviews });
  }

  // Feedback
  if (type === "feedback") {
    const feedback = await getFeedback(tenantId, userId || undefined);
    return NextResponse.json({ data: feedback });
  }

  // KPIs
  if (type === "kpis") {
    const kpis = await getKpis(tenantId, userId || undefined);
    return NextResponse.json({ data: kpis });
  }

  return badRequest("Invalid type parameter. Use: goals, reviews, feedback, kpis");
}, { label: "Performance" });

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  const action = body.action || "create_goal";

  // Create goal
  if (action === "create_goal") {
    if (!body.title) return badRequest("Missing required field: title");

    const goal = await createGoal({
      ...body,
      tenantId,
      userId: body.userId || auth.userId,
      status: body.status || "draft",
      progress: body.progress || 0,
      weight: body.weight || 1,
    } as any);
    return NextResponse.json({ data: goal }, { status: 201 });
  }

  // Create review
  if (action === "create_review") {
    if (!body.userId || !body.reviewerId) {
      return badRequest("Missing required fields: userId, reviewerId");
    }
    const review = await createReview({
      ...body,
      tenantId,
      status: "draft",
    } as any);
    return NextResponse.json({ data: review }, { status: 201 });
  }

  return badRequest("Invalid action. Use: create_goal, create_review");
}, { label: "Performance" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "goal";

  if (!id) return badRequest("id parameter required");

  const body = await request.json();

  if (type === "goal") {
    const goal = await updateGoal(id, body);
    if (!goal) return notFound("Goal not found");
    return NextResponse.json({ data: goal });
  }

  if (type === "review") {
    const review = await updateReview(id, body);
    if (!review) return notFound("Review not found");
    return NextResponse.json({ data: review });
  }

  return badRequest("Invalid type. Use: goal, review");
}, { label: "Performance" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "goal";

  if (!id) return badRequest("id parameter required");

  if (type === "goal") {
    const deleted = await deleteGoal(id);
    if (!deleted) return notFound("Goal not found");
    return NextResponse.json({ success: true });
  }

  if (type === "review") {
    const deleted = await deleteReview(id);
    if (!deleted) return notFound("Review not found");
    return NextResponse.json({ success: true });
  }

  if (type === "feedback") {
    const deleted = await deleteFeedback(id);
    if (!deleted) return notFound("Feedback not found");
    return NextResponse.json({ success: true });
  }

  if (type === "kpi") {
    const deleted = await deleteKpi(id);
    if (!deleted) return notFound("KPI not found");
    return NextResponse.json({ success: true });
  }

  return badRequest("Invalid type. Use: goal, review, feedback, kpi");
}, { label: "Performance" });
