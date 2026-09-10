import { NextRequest, NextResponse } from "next/server";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectDashboardStats,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  updateProjectMember,
  getProjectTasks,
  getTaskById,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  getKanbanTasks,
  getTaskComments,
  createTaskComment,
  deleteTaskComment,
  getTaskAttachments,
  createTaskAttachment,
  deleteTaskAttachment,
  getMilestones,
  getMilestoneById,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "@/services/hrm/projects";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound, forbidden } from "@/lib/api-handler";

// ── GET ─────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const taskId = searchParams.get("taskId");
  const kanban = searchParams.get("kanban") === "true";
  const dashboard = searchParams.get("dashboard") === "true";
  const members = searchParams.get("members") === "true";
  const comments = searchParams.get("comments") === "true";
  const attachments = searchParams.get("attachments") === "true";
  const milestones = searchParams.get("milestones") === "true";
  const milestoneId = searchParams.get("milestoneId");

  // Dashboard stats
  if (dashboard) {
    const stats = await getProjectDashboardStats(tenantId, auth.userId, auth.role);
    return NextResponse.json({ data: stats });
  }

  // Kanban board
  if (kanban) {
    const board = await getKanbanTasks(projectId || undefined);
    return NextResponse.json({ data: board });
  }

  // Members
  if (members && projectId) {
    const memberList = await getProjectMembers(projectId);
    return NextResponse.json({ data: memberList });
  }

  // Milestones
  if (milestones) {
    if (milestoneId) {
      const milestone = await getMilestoneById(milestoneId);
      if (!milestone) return notFound("Milestone not found");
      return NextResponse.json({ data: milestone });
    }
    const result = await getMilestones(projectId || undefined);
    return NextResponse.json({ data: result });
  }

  // Task comments
  if (comments && taskId) {
    const result = await getTaskComments(taskId);
    return NextResponse.json({ data: result });
  }

  // Task attachments
  if (attachments && taskId) {
    const result = await getTaskAttachments(taskId);
    return NextResponse.json({ data: result });
  }

  // Tasks
  if (type === "task") {
    if (taskId) {
      const task = await getTaskById(taskId);
      if (!task) return notFound("Task not found");
      return NextResponse.json({ data: task });
    }
    const tasks = await getProjectTasks(projectId || undefined, assigneeId || undefined);
    return NextResponse.json({ data: tasks });
  }

  // Single project
  if (id) {
    const project = await getProjectById(id);
    if (!project) return notFound("Project not found");

    if (auth.role === "employee") {
      const members = await getProjectMembers(id);
      const isMember = members.some((m) => m.userId === auth.userId);
      if (!isMember && project.ownerId !== auth.userId) {
        return forbidden("You can only view projects you are assigned to");
      }
    }

    return NextResponse.json({ data: project });
  }

  // List projects
  if (auth.role === "employee") {
    const stats = await getProjectDashboardStats(tenantId, auth.userId, auth.role);
    return NextResponse.json({ data: stats.projects });
  }

  const projects = await getProjects(tenantId);
  return NextResponse.json({ data: projects });
}, { label: "Projects" });

// ── POST ────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || searchParams.get("type");

  // Milestone creation
  if (action === "milestone") {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.projectId || !body.title) {
      return badRequest("Missing required fields: projectId, title");
    }

    const milestone = await createMilestone(tenantId, body);
    return NextResponse.json({ data: milestone }, { status: 201 });
  }

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

  // Task attachment creation
  if (action === "attachment") {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.taskId || !body.fileName || !body.fileURL) {
      return badRequest("Missing required fields: taskId, fileName, fileURL");
    }

    const attachment = await createTaskAttachment(tenantId, {
      ...body,
      userId: auth.userId,
    });
    return NextResponse.json({ data: attachment }, { status: 201 });
  }

  // Task creation
  if (action === "task") {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.projectId || !body.title) {
      return badRequest("Missing required fields: projectId, title");
    }

    const task = await createProjectTask(tenantId, body);
    return NextResponse.json({ data: task }, { status: 201 });
  }

  // Member management
  if (action === "member") {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    if (!body.projectId || !body.userId) {
      return badRequest("Missing required fields: projectId, userId");
    }

    const member = await addProjectMember(tenantId, body);
    return NextResponse.json({ data: member }, { status: 201 });
  }

  // Project creation
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  const body = await request.json();
  if (!body.name) {
    return badRequest("Missing required field: name");
  }

  const project = await createProject(tenantId, {
    ...body,
    ownerId: body.ownerId || auth.userId,
  });
  return NextResponse.json({ data: project }, { status: 201 });
}, { label: "Projects" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const taskId = searchParams.get("taskId");
  const memberId = searchParams.get("memberId");
  const milestoneId = searchParams.get("milestoneId");
  const type = searchParams.get("type");

  // Milestone update
  if (type === "milestone" && milestoneId) {
    const body = await request.json();
    const milestone = await updateMilestone(milestoneId, body);
    if (!milestone) return notFound("Milestone not found");
    return NextResponse.json({ data: milestone });
  }

  // Task update
  if (type === "task" && taskId) {
    const body = await request.json();
    const task = await updateProjectTask(taskId, body);
    if (!task) return notFound("Task not found");
    return NextResponse.json({ data: task });
  }

  // Member update
  if (type === "member" && memberId) {
    const body = await request.json();
    const member = await updateProjectMember(memberId, body);
    if (!member) return notFound("Member not found");
    return NextResponse.json({ data: member });
  }

  // Project update
  if (!id) return badRequest("id parameter required");
  const body = await request.json();
  const project = await updateProject(id, body);
  if (!project) return notFound("Project not found");

  return NextResponse.json({ data: project });
}, { label: "Projects" });

// ── DELETE ──────────────────────────────────────────────

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const taskId = searchParams.get("taskId");
  const memberId = searchParams.get("memberId");
  const milestoneId = searchParams.get("milestoneId");
  const commentId = searchParams.get("commentId");
  const attachmentId = searchParams.get("attachmentId");
  const type = searchParams.get("type");

  // Milestone delete
  if (type === "milestone" && milestoneId) {
    const deleted = await deleteMilestone(milestoneId);
    if (!deleted) return notFound("Milestone not found");
    return NextResponse.json({ success: true });
  }

  // Comment delete
  if (type === "comment" && commentId) {
    const deleted = await deleteTaskComment(commentId);
    if (!deleted) return notFound("Comment not found");
    return NextResponse.json({ success: true });
  }

  // Attachment delete
  if (type === "attachment" && attachmentId) {
    const deleted = await deleteTaskAttachment(attachmentId);
    if (!deleted) return notFound("Attachment not found");
    return NextResponse.json({ success: true });
  }

  // Task delete
  if (type === "task" && taskId) {
    const deleted = await deleteProjectTask(taskId);
    if (!deleted) return notFound("Task not found");
    return NextResponse.json({ success: true });
  }

  // Member delete
  if (type === "member" && memberId) {
    const deleted = await removeProjectMember(memberId);
    if (!deleted) return notFound("Member not found");
    return NextResponse.json({ success: true });
  }

  // Project delete
  if (!id) return badRequest("id parameter required");
  const deleted = await deleteProject(id);
  if (!deleted) return notFound("Project not found");

  return NextResponse.json({ success: true });
}, { label: "Projects" });
