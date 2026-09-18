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
import { getUserName, getUserById } from "@/services/hrm/notifications";

// ── GET ─────────────────────────────────────────────────

const HR_LEVEL_ROLES = new Set(["super_admin", "hr_admin", "admin"]);

/** Can the caller read/write content of this task? Employees and managers may
 *  only touch tasks assigned to them or in projects they own; HR all. */
async function canAccessTask(caller: { userId: string; role: string }, taskId: string): Promise<boolean> {
  if (HR_LEVEL_ROLES.has(caller.role)) return true;
  const task = await getTaskById(taskId);
  if (!task) return false;
  if ((task as any).assigneeId === caller.userId) return true;
  if ((task as any).createdById === caller.userId) return true;
  const project = task.projectId ? await getProjectById(String(task.projectId)) : null;
  if (project && (project as any).ownerId === caller.userId) return true;
  return false;
}

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
    // IDOR guard: employees may only read comments on tasks they can access.
    if (!HR_LEVEL_ROLES.has(auth.role) && !(await canAccessTask(auth, taskId))) {
      return forbidden("You can only view comments on your own tasks");
    }
    const result = await getTaskComments(taskId);
    return NextResponse.json({ data: result });
  }

  // Task attachments
  if (attachments && taskId) {
    // IDOR guard: attachments are files — same access rule as comments.
    if (!HR_LEVEL_ROLES.has(auth.role) && !(await canAccessTask(auth, taskId))) {
      return forbidden("You can only view attachments on your own tasks");
    }
    const result = await getTaskAttachments(taskId);
    return NextResponse.json({ data: result });
  }

  // Tasks
  if (type === "task") {
    if (taskId) {
      const task = await getTaskById(taskId);
      if (!task) return notFound("Task not found");
      if (!HR_LEVEL_ROLES.has(auth.role) && !(await canAccessTask(auth, taskId))) {
        return forbidden("You can only view tasks assigned to you");
      }
      return NextResponse.json({ data: task });
    }
    const tasks = await getProjectTasks(projectId || undefined, assigneeId || undefined);
    // Employees only ever see their own assigned tasks.
    const scoped = auth.role === "employee"
      ? tasks.filter((t: any) => (t as any).assigneeId === auth.userId)
      : tasks;
    return NextResponse.json({ data: scoped });
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
  // Sub-actions are addressed via ?action=… (or legacy ?type=…). The request
  // BODY may also carry action/task — some UI flows post them inline — but a
  // body action must never silently re-route a project creation that also
  // happens to include a `task` field (the 1.3 "creation requires name"
  // contract). Sub-action dispatch wins only when the URL carries it.
  const bodyAction = searchParams.get("action") || searchParams.get("type");
  const earlyBody = bodyAction ? null : await request.json().catch(() => null);
  const action = bodyAction || (earlyBody as any)?.action;

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
    if (!HR_LEVEL_ROLES.has(auth.role) && !(await canAccessTask(auth, body.taskId))) {
      return forbidden("You can only comment on your own tasks");
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
    if (!HR_LEVEL_ROLES.has(auth.role) && !(await canAccessTask(auth, body.taskId))) {
      return forbidden("You can only attach files to your own tasks");
    }
    // Attachment URL hygiene: must be a http(s)/data URL — blocks javascript:
    // and other scheme-injection payloads stored for teammates to click.
    if (!/^(https?:\/\/|data:(image|application)\/)/i.test(String(body.fileURL))) {
      return badRequest("Invalid attachment URL");
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

    const body = earlyBody || (await request.json());
    if (!body.projectId || !body.title) {
      return badRequest("Missing required fields: projectId, title");
    }
    // Employees may only create tasks inside projects they belong to.
    if (auth.role === "employee") {
      const members = await getProjectMembers(String(body.projectId));
      const isMember = members.some((m: any) => m.userId === auth.userId);
      if (!isMember) {
        return forbidden("You can only create tasks in projects you are assigned to");
      }
    }

    const task = await createProjectTask(tenantId, {
      ...body,
      assignerId: auth.userId,
    });
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

    const { getUserName } = await import("@/services/hrm/notifications");
    const member = await addProjectMember(tenantId, {
      ...body,
      actorId: auth.userId,
      addedByName: await getUserName(auth.userId),
    });
    return NextResponse.json({ data: member }, { status: 201 });
  }

  // Project creation
  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";

  // Reuse the early-parsed body when available — a second request.json() call
  // throws "Body already read" and turned a clean 400 into a 500.
  const body = earlyBody || (await request.json().catch(() => null)) || {};
  if (!body.name) {
    return badRequest("Missing required field: name");
  }

  // Manager-created projects scope their audience to the MANAGER's own
  // department (from the user record) — not an optional client-supplied
  // field. Otherwise the fan-out either misses the real team or (worse)
  // notifies every employee in the tenant.
  let department = (body as any).department as string | undefined;
  if (auth.role === "manager" && !department) {
    department = (await getUserById(auth.userId))?.department || undefined;
  }

  const project = await createProject(tenantId, {
    ...body,
    ownerId: body.ownerId || auth.userId,
    creatorRole: auth.role,
    department,
  });
  return NextResponse.json({ data: project }, { status: 201 });
}, { label: "Projects" });

// ── PATCH ───────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  const type = searchParams.get("type");

  // Task status transitions are allowed for the ASSIGNEE without admin
  // rights — the employee "complete my task" flow was previously impossible
  // because this whole handler sat behind requireAdmin. Assignees may only
  // change `status`; everything else still requires admin.
  if (type === "task" && taskId) {
    const assigneeAuth = await requireAuth();
    if (isErrorResponse(assigneeAuth)) return assigneeAuth;
    const taskBody = await request.json();
    const task = await getTaskById(taskId);
    if (!task) return notFound("Task not found");
    if ((task as any).assigneeId !== assigneeAuth.userId) {
      const adminAuth = await requireAdmin();
      if (isErrorResponse(adminAuth)) return adminAuth;
    } else if (taskBody.status === undefined || Object.keys(taskBody).some((k) => k !== "status")) {
      return badRequest("Assignees can only update the task status");
    }
    const updated = await updateProjectTask(taskId, taskBody, {
      actorId: assigneeAuth.userId,
    });
    if (!updated) return notFound("Task not found");
    return NextResponse.json({ data: updated });
  }

  const auth = await requireAdmin();
  if (isErrorResponse(auth)) return auth;

  const id = searchParams.get("id");
  const memberId = searchParams.get("memberId");
  const milestoneId = searchParams.get("milestoneId");

  // Milestone update
  if (type === "milestone" && milestoneId) {
    const body = await request.json();
    const milestone = await updateMilestone(milestoneId, body);
    if (!milestone) return notFound("Milestone not found");
    return NextResponse.json({ data: milestone });
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
