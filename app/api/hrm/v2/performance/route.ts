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
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getKpis,
  getKpiById,
  createKpi,
  updateKpi,
  deleteKpi,
} from "@/services/hrm/performance";
import { requireAuth, requireAdmin, requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";
import { getTasks } from "@/services/hrm/tasks";
import { getAttendanceRecords } from "@/lib/db/attendance";
import { getDb } from "@/lib/db/mongo-helper";
import { ObjectId } from "@/lib/db/mysql";

const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

async function isDirectReportOf(managerId: string, employeeId: string): Promise<boolean> {
  try {
    if (!managerId || !employeeId) return false;
    if (String(managerId) === String(employeeId)) return true;
    const db = await getDb();
    if (!db) return false;

    // Find manager record
    const manager = await db.collection("users").findOne({
      $or: [
        { _id: new ObjectId(managerId) },
        { legacyId: managerId },
        { id: isNaN(Number(managerId)) ? -1 : Number(managerId) },
      ],
    });
    if (!manager) return false;

    // Find employee record
    const employee = await db.collection("users").findOne({
      $or: [
        { _id: new ObjectId(employeeId) },
        { legacyId: employeeId },
        { id: isNaN(Number(employeeId)) ? -1 : Number(employeeId) },
      ],
    });
    if (!employee) return false;

    // Check manager department vs employee department
    const managerDept = String(manager.departmentName || manager.department || "").toLowerCase().trim();
    const employeeDept = String(employee.departmentName || employee.department || "").toLowerCase().trim();
    if (managerDept && employeeDept && managerDept === employeeDept) {
      return true;
    }

    // Check reportingManager field (may be manager displayName, email, or id)
    const rep = String(employee.reportingManager || "").toLowerCase().trim();
    const managerName = String(manager.displayName || manager.name || "").toLowerCase().trim();
    const managerEmail = String(manager.email || "").toLowerCase().trim();
    if (managerName && rep === managerName) return true;
    if (managerEmail && rep === managerEmail) return true;
    if (rep === String(manager.id) || rep === String(manager.legacyId) || rep === String(managerId)) return true;
    if (employee.managerEmail && managerEmail && String(employee.managerEmail).toLowerCase().trim() === managerEmail) return true;
    if (employee.managerId && (String(employee.managerId) === String(manager.id) || String(employee.managerId) === String(manager.legacyId) || String(employee.managerId) === String(managerId))) return true;

    return false;
  } catch {
    return false;
  }
}

/** Who may act on someone else's performance record: HR always, managers for
 *  their direct reports and departmental team, everyone else never. */
async function canActOn(caller: { userId: string; role: string }, targetUserId: string): Promise<boolean> {
  if (caller.userId === targetUserId) return true;
  if (HR_LEVEL_ROLES.has(caller.role)) return true;
  if (caller.role === "manager") return isDirectReportOf(caller.userId, targetUserId);
  return false;
}

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
    if (auth.role === "employee") {
      const stats = await getDashboardStats(tenantId, auth.userId);
      return NextResponse.json({ data: stats });
    }
    if (auth.role === "manager") {
      if (userId) {
        if (!(await canActOn(auth, userId))) {
          return forbidden("You can only view dashboard stats for yourself or direct reports");
        }
        const stats = await getDashboardStats(tenantId, userId);
        return NextResponse.json({ data: stats });
      }
      // Scoped team stats
      const allGoals = await getGoals(tenantId);
      const teamGoals: any[] = [];
      for (const g of allGoals) {
        if (await canActOn(auth, (g as any).userId)) teamGoals.push(g);
      }
      const allReviews = await getReviews(tenantId);
      const teamReviews: any[] = [];
      for (const r of allReviews) {
        if (r.userId === auth.userId || r.reviewerId === auth.userId || (await isDirectReportOf(auth.userId, (r as any).userId))) {
          teamReviews.push(r);
        }
      }
      const allFeedback = await getFeedback(tenantId);
      const teamFeedback: any[] = [];
      for (const f of allFeedback) {
        if (f.userId === auth.userId || (await isDirectReportOf(auth.userId, (f as any).userId))) {
          teamFeedback.push(f);
        }
      }
      const allKpis = await getKpis(tenantId);
      const teamKpis: any[] = [];
      for (const k of allKpis) {
        if (k.userId === auth.userId || (await isDirectReportOf(auth.userId, (k as any).userId))) {
          teamKpis.push(k);
        }
      }
      return NextResponse.json({
        data: {
          totalGoals: teamGoals.length,
          achievedGoals: teamGoals.filter((g) => g.status === "achieved").length,
          activeReviews: teamReviews.filter((r) => r.status === "submitted" || r.status === "draft").length,
          completedReviews: teamReviews.filter((r) => r.status === "completed").length,
          averageKpiScore: teamKpis.length > 0
            ? Math.round(teamKpis.reduce((sum, k) => sum + (k.actual / k.target) * 100, 0) / teamKpis.length)
            : 0,
          pendingFeedback: teamFeedback.filter((f) => f.status === "pending").length,
        },
      });
    }

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
      if (!(await canActOn(auth, (goal as any).userId))) {
        return forbidden("You can only view goals for yourself or direct reports");
      }
      return NextResponse.json({ data: goal });
    }
    const targetUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    if (auth.role === "manager" && userId && !(await canActOn(auth, userId))) {
      return forbidden("You can only view goals for yourself or direct reports");
    }
    let goals = await getGoals(tenantId, targetUserId);
    if (auth.role === "manager" && !userId) {
      const allowed: any[] = [];
      for (const g of goals) {
        if (await canActOn(auth, (g as any).userId)) allowed.push(g);
      }
      goals = allowed;
    }
    return NextResponse.json({ data: goals });
  }

  // Reviews
  if (type === "reviews") {
    if (id) {
      const review = await getReviewById(id);
      if (!review) return notFound("Review not found");
      const rev = review as any;
      const canView = rev.userId === auth.userId || rev.reviewerId === auth.userId || (await canActOn(auth, rev.userId));
      if (!canView) return forbidden("You can only view your own or direct reports' reviews");
      return NextResponse.json({ data: review });
    }
    if (auth.role === "manager" && userId && !(await canActOn(auth, userId))) {
      return forbidden("You can only view reviews for yourself or direct reports");
    }
    const targetUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    let reviews = await getReviews(tenantId, targetUserId);
    if (auth.role === "employee") {
      reviews = reviews.filter((r: any) => r.userId === auth.userId || r.reviewerId === auth.userId);
    } else if (auth.role === "manager" && !userId) {
      const allowed: any[] = [];
      for (const r of reviews) {
        if (r.userId === auth.userId || r.reviewerId === auth.userId || (await isDirectReportOf(auth.userId, (r as any).userId))) {
          allowed.push(r);
        }
      }
      reviews = allowed;
    }
    return NextResponse.json({ data: reviews });
  }

  // Feedback
  if (type === "feedback") {
    if (auth.role === "manager" && userId && !(await canActOn(auth, userId))) {
      return forbidden("You can only view feedback for yourself or direct reports");
    }
    const targetUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    let feedback = await getFeedback(tenantId, targetUserId);
    if (auth.role === "employee") {
      feedback = feedback.filter((f: any) => f.userId === auth.userId || f.fromUserId === auth.userId);
    } else if (auth.role === "manager" && !userId) {
      const allowed: any[] = [];
      for (const f of feedback) {
        if (f.userId === auth.userId || (await isDirectReportOf(auth.userId, (f as any).userId))) {
          allowed.push(f);
        }
      }
      feedback = allowed;
    }
    return NextResponse.json({ data: feedback });
  }

  // KPIs
  if (type === "kpis") {
    if (auth.role === "manager" && userId && !(await canActOn(auth, userId))) {
      return forbidden("You can only view KPIs for yourself or direct reports");
    }
    const targetUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    let kpis = await getKpis(tenantId, targetUserId);
    if (auth.role === "employee") {
      kpis = kpis.filter((k: any) => k.userId === auth.userId);
    } else if (auth.role === "manager" && !userId) {
      const allowed: any[] = [];
      for (const k of kpis) {
        if (k.userId === auth.userId || (await isDirectReportOf(auth.userId, (k as any).userId))) {
          allowed.push(k);
        }
      }
      kpis = allowed;
    }
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
    if (!body.title || typeof body.title !== "string" || body.title.trim().length < 3) {
      return badRequest("Goal title is required (min 3 characters)");
    }
    if (body.title.length > 150) {
      return badRequest("Goal title must be 150 characters or fewer");
    }

    // Ownership: employees can only create goals for themselves; managers for
    // direct reports; HR for anyone.
    const targetUserId = body.userId || auth.userId;
    if (!(await canActOn(auth, targetUserId))) {
      return forbidden("You can only create goals for yourself or your direct reports");
    }

    const goal = await createGoal({
      ...body,
      tenantId,
      userId: targetUserId,
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
    // The reviewer identity is always the authenticated caller — a spoofed
    // reviewerId would let anyone impersonate a reviewer.
    if (body.reviewerId !== auth.userId) {
      return forbidden("Reviewer must be the logged-in user");
    }
    // Employees cannot open reviews on other people; managers only on direct
    // reports; HR on anyone.
    if (!(await canActOn(auth, body.userId))) {
      return forbidden("You can only create reviews for your direct reports");
    }
    const review = await createReview({
      ...body,
      tenantId,
      status: "draft",
    } as any);
    return NextResponse.json({ data: review }, { status: 201 });
  }

  // Create KPI
  if (action === "create_kpi") {
    if (!body.title || body.target === undefined) {
      return badRequest("title and target are required for KPI");
    }
    const kpi = await createKpi({
      ...body,
      tenantId,
      actual: body.actual ?? 0,
      unit: body.unit || "%",
      weight: body.weight ?? 1,
      status: body.status || "active",
    } as any);
    return NextResponse.json({ data: kpi }, { status: 201 });
  }

  // Create feedback
  if (action === "create_feedback") {
    if (!body.userId || !body.feedback) {
      return badRequest("userId and feedback are required");
    }
    const fb = await createFeedback({
      ...body,
      tenantId,
      fromUserId: auth.userId,
      type: body.type || "praise",
      rating: body.rating ?? 5,
      status: "active",
    } as any);
    return NextResponse.json({ data: fb }, { status: 201 });
  }

  return badRequest("Invalid action. Use: create_goal, create_review, create_kpi, create_feedback");
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
    const existing: any = await getGoalById(id);
    if (!existing) return notFound("Goal not found");
    // Ownership: only the goal owner, their manager, or HR can update it.
    if (!(await canActOn(auth, existing.userId))) {
      return forbidden("You can only update your own goals");
    }
    // Ownership transfer via PATCH is an HR action.
    if (body.userId && body.userId !== existing.userId && !HR_LEVEL_ROLES.has(auth.role)) {
      return forbidden("Only HR can reassign goals");
    }
    const goal = await updateGoal(id, body);
    return NextResponse.json({ data: goal });
  }

  if (type === "review") {
    const existing: any = await getReviewById(id);
    if (!existing) return notFound("Review not found");
    // Only the reviewer, the review subject, or HR can update a review.
    if (existing.reviewerId !== auth.userId && existing.userId !== auth.userId && !HR_LEVEL_ROLES.has(auth.role)) {
      return forbidden("You can only update reviews you authored or own");
    }
    const review = await updateReview(id, body);
    return NextResponse.json({ data: review });
  }

  if (type === "kpi") {
    const updated = await updateKpi(id, body);
    if (!updated) return notFound("KPI not found");
    return NextResponse.json({ data: updated });
  }

  if (type === "feedback") {
    const updated = await updateFeedback(id, body);
    if (!updated) return notFound("Feedback not found");
    return NextResponse.json({ data: updated });
  }

  return badRequest("Invalid type. Use: goal, review, kpi, feedback");
}, { label: "Performance" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireHrLevel();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "goal";

  if (!id) return badRequest("id parameter required");

  if (type === "goal") {
    const existing: any = await getGoalById(id);
    if (!existing) return notFound("Goal not found");
    if (!(await canActOn(auth, existing.userId))) {
      return forbidden("You can only delete your own goals or those of direct reports");
    }
    const deleted = await deleteGoal(id);
    if (!deleted) return notFound("Goal not found");
    return NextResponse.json({ success: true });
  }

  if (type === "review") {
    const existing: any = await getReviewById(id);
    if (!existing) return notFound("Review not found");
    if (!HR_LEVEL_ROLES.has(auth.role) && existing.reviewerId !== auth.userId) {
      return forbidden("Only HR or the review author can delete this review");
    }
    const deleted = await deleteReview(id);
    if (!deleted) return notFound("Review not found");
    return NextResponse.json({ success: true });
  }

  if (type === "feedback") {
    if (!HR_LEVEL_ROLES.has(auth.role)) {
      return forbidden("Only HR admins can delete feedback");
    }
    const deleted = await deleteFeedback(id);
    if (!deleted) return notFound("Feedback not found");
    return NextResponse.json({ success: true });
  }

  if (type === "kpi") {
    if (!HR_LEVEL_ROLES.has(auth.role)) {
      return forbidden("Only HR admins can delete KPIs");
    }
    const deleted = await deleteKpi(id);
    if (!deleted) return notFound("KPI not found");
    return NextResponse.json({ success: true });
  }

  return badRequest("Invalid type. Use: goal, review, feedback, kpi");
}, { label: "Performance" });
