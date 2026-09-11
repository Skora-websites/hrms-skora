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
import { getTasks } from "@/services/hrm/tasks";
import { getAttendanceRecords } from "@/lib/db/attendance";

// "My Performance" payload for the employee self-view: task completion +
// attendance-derived metrics, computed server-side from real records.
async function getMyPerformance(tenantId: string, userId: string) {
  const [tasks, attendance] = await Promise.all([
    getTasks(tenantId, { assigneeId: userId }),
    getAttendanceRecords({ userId }),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  const monthAttendance = attendance.filter((r) => r.date >= new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(monthStart));
  const workDays = monthAttendance.filter((r) => r.status !== "ABSENT");
  const onTime = workDays.filter((r) => {
    const t = new Date(r.punchInTime);
    const istMinutes = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t).replace(":", ""));
    return istMinutes <= 1030;
  });

  const hoursLogged = Math.round(monthAttendance.reduce((s, r) => s + (r.workHours || 0), 0));

  const monthlyScores: { month: string; score: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit" }).format(d);
    const monthRows = attendance.filter((r) => r.date.startsWith(key));
    const completionRate = tasks.length > 0
      ? tasks.filter((t) => t.status === "completed" && t.updatedAt && new Date(t.updatedAt).getMonth() === d.getMonth()).length / tasks.length * 100
      : 0;
    const attendanceRate = monthRows.length > 0
      ? monthRows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length / monthRows.length * 100
      : 0;
    monthlyScores.push({
      month: new Intl.DateTimeFormat("en", { month: "short" }).format(d),
      score: Math.round(completionRate * 0.5 + attendanceRate * 0.5),
    });
  }

  const attendanceRate = workDays.length > 0 ? (onTime.length / workDays.length) * 100 : 0;
  const overallScore = Math.round(
    (tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0) * 0.5 + attendanceRate * 0.5
  );

  return {
    tasksCompleted: completedTasks,
    totalTasks: tasks.length,
    hoursLogged,
    attendanceRate,
    onTimeRate: attendanceRate,
    overallScore,
    monthlyScores,
  };
}

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

  // Employee self-view metrics
  if (searchParams.get("mine") === "true") {
    const stats = await getMyPerformance(tenantId, auth.userId);
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
