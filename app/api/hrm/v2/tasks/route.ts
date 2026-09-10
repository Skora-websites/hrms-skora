import { NextRequest, NextResponse } from "next/server";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskDashboardStats,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  getTaskAuditLogs,
} from "@/services/hrm/tasks";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const dashboard = searchParams.get("dashboard") === "true";
  const comments = searchParams.get("comments") === "true";
  const auditLogs = searchParams.get("auditLogs") === "true";
  const taskId = searchParams.get("taskId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  // Dashboard stats
  if (dashboard) {
    const stats = await getTaskDashboardStats(tenantId, auth.userId, auth.role);
    return NextResponse.json({ data: stats });
  }

  // Task comments
  if (comments && taskId) {
    const result = await getTaskComments(taskId);
    return NextResponse.json({ data: result });
  }

  // Task audit logs
  if (auditLogs && taskId) {
    const result = await getTaskAuditLogs(taskId);
    return NextResponse.json({ data: result });
  }

  // Single task
  if (id) {
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");

    // Employees can only view their own tasks
    if (auth.role === "employee" && task.assigneeId !== auth.userId) {
      return forbidden("You can only view tasks assigned to you");
    }

    return NextResponse.json({ data: task });
  }

  // List tasks
  const tasks = await getTasks(tenantId, {
    assigneeId: assigneeId || undefined,
    status: status || undefined,
    priority: priority || undefined,
    search: search || undefined,
  });

  // Filter for employee role
  const filtered = auth.role === "employee"
    ? tasks.filter((t) => t.assigneeId === auth.userId)
    : tasks;

  return NextResponse.json({ data: filtered });
}, { label: "Tasks" });

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // Task comment creation
  if (action === "comment") {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.taskId || !body.content) {
      return badRequest("Missing required fields: taskId, content");
    }

    const comment = await createTaskComment(tenantId, {
      ...body,
      userId: auth.userId,
      userDisplayName: "Team Member",
    });
    return NextResponse.json({ data: comment }, { status: 201 });
  }

  // Task creation
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  if (!body.title) {
    return badRequest("Missing required field: title");
  }

  const task = await createTask(tenantId, {
    ...body,
    assignerId: auth.userId,
    assignerName: "Admin",
  });
  return NextResponse.json({ data: task }, { status: 201 });
}, { label: "Tasks" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("id parameter required");

  const body = await request.json();

  // Employees can only update status of tasks assigned to them
  if (auth.role === "employee") {
    const task = await getTaskById(id);
    if (!task) return notFound("Task not found");
    if (task.assigneeId !== auth.userId) {
      return forbidden("You can only update tasks assigned to you");
    }
    // Employees can only change status
    const allowedFields = ["status"];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (Object.keys(updateData).length === 0) {
      return badRequest("Employees can only update task status");
    }
    const taskUpdated = await updateTask(id, updateData, auth.userId, auth.role);
    if (!taskUpdated) return notFound("Task not found");
    return NextResponse.json({ data: taskUpdated });
  }

  const task = await updateTask(id, body, auth.userId, auth.role);
  if (!task) return notFound("Task not found");
  return NextResponse.json({ data: task });
}, { label: "Tasks" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const commentId = searchParams.get("commentId");

  if (commentId && searchParams.get("type") === "comment") {
    const deleted = await deleteTaskComment(commentId);
    if (!deleted) return notFound("Comment not found");
    return NextResponse.json({ success: true });
  }

  if (!id) return badRequest("id parameter required");
  const deleted = await deleteTask(id);
  if (!deleted) return notFound("Task not found");
  return NextResponse.json({ success: true });
}, { label: "Tasks" });
