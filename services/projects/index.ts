import "server-only";
import {
  projectsService,
  projectMembersService,
  projectTasksService,
  hrmUsersService,
  milestonesService,
  taskCommentsService,
  taskAttachmentsService,
} from "@/lib/hrm/firestore";
import type { Project, ProjectMember, ProjectTask, HRMUser, Milestone, TaskComment, TaskAttachment } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Projects Service
// ══════════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────

/** Calculate progress (0-100) for a project based on completed vs total tasks */
async function calculateProjectProgress(projectId: string): Promise<number> {
  const tasks = await projectTasksService.findMany({
    where: [{ field: "projectId", op: "==", value: projectId }],
  });
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

async function enrichProjectWithProgress(project: Project): Promise<Project> {
  return {
    ...project,
    progress: await calculateProjectProgress(project.id),
  };
}

// ── Projects ────────────────────────────────────────────

export async function getProjects(tenantId: string): Promise<Project[]> {
  const projects = await projectsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
  return Promise.all(projects.map(enrichProjectWithProgress));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const project = await projectsService.findById(id);
  if (!project) return null;
  return enrichProjectWithProgress(project);
}

export async function createProject(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    status: Project["status"];
    priority: Project["priority"];
    ownerId: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Project> {
  return projectsService.create({
    tenantId,
    name: data.name,
    description: data.description || "",
    status: data.status || "planning",
    priority: data.priority || "medium",
    ownerId: data.ownerId,
    startDate: data.startDate || new Date(),
    endDate: data.endDate || null,
  } as any);
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project | null> {
  return projectsService.update(id, data as any);
}

export async function deleteProject(id: string): Promise<boolean> {
  // Delete associated tasks and members
  const tasks = await projectTasksService.findMany({
    where: [{ field: "projectId", op: "==", value: id }],
  });
  for (const task of tasks) {
    await projectTasksService.delete(task.id);
  }

  const members = await projectMembersService.findMany({
    where: [{ field: "projectId", op: "==", value: id }],
  });
  for (const member of members) {
    await projectMembersService.delete(member.id);
  }

  // Delete associated milestones
  const milestones = await milestonesService.findMany({
    where: [{ field: "projectId", op: "==", value: id }],
  });
  for (const m of milestones) {
    await milestonesService.delete(m.id);
  }

  return projectsService.delete(id);
}

export async function getProjectsByOwner(
  tenantId: string,
  ownerId: string
): Promise<Project[]> {
  const projects = await projectsService.findManyInTenant(tenantId, {
    where: [{ field: "ownerId", op: "==", value: ownerId }],
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
  return Promise.all(projects.map(enrichProjectWithProgress));
}

export async function getProjectsByMember(
  tenantId: string,
  userId: string
): Promise<Project[]> {
  const memberships = await projectMembersService.findMany({
    where: [{ field: "userId", op: "==", value: userId }],
  });

  if (memberships.length === 0) return [];

  const projectIds = memberships.map((m) => m.projectId);
  const projects = await projectsService.findManyInTenant(tenantId);
  const filtered = projects.filter((p) => projectIds.includes(p.id));
  return Promise.all(filtered.map(enrichProjectWithProgress));
}

// ── Dashboard Stats ─────────────────────────────────────

export async function getProjectDashboardStats(
  tenantId: string,
  userId: string,
  userRole: string
): Promise<{
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueTasks: number;
  projects: Project[];
}> {
  let projects: Project[];

  if (userRole === "employee") {
    const member = await getProjectsByMember(tenantId, userId);
    const owned = await getProjectsByOwner(tenantId, userId);
    const ownedIds = new Set(owned.map((p) => p.id));
    for (const p of owned) {
      if (!member.some((pr) => pr.id === p.id)) {
        member.push(p);
      }
    }
    projects = member;
  } else {
    projects = await getProjects(tenantId);
  }

  const now = new Date();
  const activeProjects = projects.filter(
    (p) => p.status === "in_progress" || p.status === "planning"
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === "completed"
  ).length;

  const projectIds = projects.map((p) => p.id);
  let overdueTasks = 0;
  for (const pid of projectIds) {
    const tasks = await projectTasksService.findMany({
      where: [
        { field: "projectId", op: "==", value: pid },
        { field: "status", op: "!=", value: "completed" },
      ],
    });
    overdueTasks += tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
  }

  return {
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    overdueTasks,
    projects,
  };
}

// ── Project Members ─────────────────────────────────────

export async function getProjectMembers(
  projectId: string
): Promise<(ProjectMember & { user?: HRMUser })[]> {
  const members = await projectMembersService.findMany({
    where: [{ field: "projectId", op: "==", value: projectId }],
  });

  const enriched = await Promise.all(
    members.map(async (m) => {
      const user = await hrmUsersService.findById(m.userId);
      return { ...m, user: user || undefined };
    })
  );

  return enriched;
}

export async function addProjectMember(
  tenantId: string,
  data: {
    projectId: string;
    userId: string;
    role: ProjectMember["role"];
    allocationPercentage?: number;
  }
): Promise<ProjectMember> {
  const existing = await projectMembersService.findOneInTenant(
    tenantId,
    "userId",
    data.userId
  );
  if (existing && existing.projectId === data.projectId) {
    return existing;
  }

  return projectMembersService.create({
    tenantId,
    projectId: data.projectId,
    userId: data.userId,
    role: data.role || "member",
    allocationPercentage: data.allocationPercentage || 100,
  } as any);
}

export async function removeProjectMember(id: string): Promise<boolean> {
  return projectMembersService.delete(id);
}

export async function updateProjectMember(
  id: string,
  data: Partial<ProjectMember>
): Promise<ProjectMember | null> {
  return projectMembersService.update(id, data as any);
}

// ── Project Tasks ───────────────────────────────────────

export async function getProjectTasks(
  projectId?: string,
  assigneeId?: string
): Promise<ProjectTask[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (projectId) {
    where.push({ field: "projectId", op: "==", value: projectId });
  }
  if (assigneeId) {
    where.push({ field: "assigneeId", op: "==", value: assigneeId });
  }

  return projectTasksService.findMany({
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getTaskById(id: string): Promise<ProjectTask | null> {
  return projectTasksService.findById(id);
}

export async function createProjectTask(
  tenantId: string,
  data: {
    projectId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    priority: ProjectTask["priority"];
    status: ProjectTask["status"];
    startDate?: Date;
    dueDate?: Date;
    estimatedHours?: number;
  }
): Promise<ProjectTask> {
  return projectTasksService.create({
    tenantId,
    projectId: data.projectId,
    title: data.title,
    description: data.description || "",
    assigneeId: data.assigneeId || "",
    priority: data.priority || "medium",
    status: data.status || "todo",
    startDate: data.startDate || null,
    dueDate: data.dueDate || null,
    estimatedHours: data.estimatedHours || 0,
    actualHours: 0,
  } as any);
}

export async function updateProjectTask(
  id: string,
  data: Partial<ProjectTask>
): Promise<ProjectTask | null> {
  const updateData: Partial<ProjectTask> = { ...data };
  if (data.status === "completed" && !data.completedAt) {
    updateData.completedAt = new Date();
  }
  return projectTasksService.update(id, updateData as any);
}

export async function deleteProjectTask(id: string): Promise<boolean> {
  // Delete associated comments and attachments
  const comments = await taskCommentsService.findMany({
    where: [{ field: "taskId", op: "==", value: id }],
  });
  for (const c of comments) {
    await taskCommentsService.delete(c.id);
  }

  const attachments = await taskAttachmentsService.findMany({
    where: [{ field: "taskId", op: "==", value: id }],
  });
  for (const a of attachments) {
    await taskAttachmentsService.delete(a.id);
  }

  return projectTasksService.delete(id);
}

export async function getKanbanTasks(
  projectId?: string
): Promise<Record<string, ProjectTask[]>> {
  const tasks = await getProjectTasks(projectId);

  return {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    review: tasks.filter((t) => t.status === "review"),
    completed: tasks.filter((t) => t.status === "completed"),
  };
}

// ── Task Comments ───────────────────────────────────────

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  return taskCommentsService.findMany({
    where: [{ field: "taskId", op: "==", value: taskId }],
    orderByField: "createdAt",
    orderByDirection: "asc",
  });
}

export async function createTaskComment(
  tenantId: string,
  data: {
    taskId: string;
    userId: string;
    userDisplayName: string;
    userPhotoURL?: string;
    content: string;
  }
): Promise<TaskComment> {
  return taskCommentsService.create({
    tenantId,
    taskId: data.taskId,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    userPhotoURL: data.userPhotoURL || "",
    content: data.content,
  } as any);
}

export async function deleteTaskComment(id: string): Promise<boolean> {
  return taskCommentsService.delete(id);
}

// ── Task Attachments ────────────────────────────────────

export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  return taskAttachmentsService.findMany({
    where: [{ field: "taskId", op: "==", value: taskId }],
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function createTaskAttachment(
  tenantId: string,
  data: {
    taskId: string;
    userId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileURL: string;
  }
): Promise<TaskAttachment> {
  return taskAttachmentsService.create({
    tenantId,
    taskId: data.taskId,
    userId: data.userId,
    fileName: data.fileName,
    fileSize: data.fileSize,
    fileType: data.fileType,
    fileURL: data.fileURL,
  } as any);
}

export async function deleteTaskAttachment(id: string): Promise<boolean> {
  return taskAttachmentsService.delete(id);
}

// ── Milestones ──────────────────────────────────────────

export async function getMilestones(projectId?: string): Promise<Milestone[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (projectId) {
    where.push({ field: "projectId", op: "==", value: projectId });
  }
  return milestonesService.findMany({
    where: where.length > 0 ? where : undefined,
    orderByField: "dueDate",
    orderByDirection: "asc",
  });
}

export async function getMilestoneById(id: string): Promise<Milestone | null> {
  return milestonesService.findById(id);
}

export async function createMilestone(
  tenantId: string,
  data: {
    projectId: string;
    title: string;
    description?: string;
    dueDate?: Date;
    status: Milestone["status"];
  }
): Promise<Milestone> {
  return milestonesService.create({
    tenantId,
    projectId: data.projectId,
    title: data.title,
    description: data.description || "",
    dueDate: data.dueDate || null,
    status: data.status || "pending",
  } as any);
}

export async function updateMilestone(
  id: string,
  data: Partial<Milestone>
): Promise<Milestone | null> {
  const updateData: Partial<Milestone> = { ...data };
  if (data.status === "completed" && !data.completedAt) {
    updateData.completedAt = new Date();
  }
  if (data.status !== "completed") {
    updateData.completedAt = null as any;
  }
  return milestonesService.update(id, updateData as any);
}

export async function deleteMilestone(id: string): Promise<boolean> {
  return milestonesService.delete(id);
}
