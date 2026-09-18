import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongo-helper";
import {
  projectsService,
  projectMembersService,
  projectTasksService,
  milestonesService,
  taskCommentsService,
  taskAttachmentsService,
} from "@/lib/hrm/firestore";
import {
  notifyUsers,
  getUserIdsByRole,
  getEmployeeIdsByDepartment,
  getUserName,
} from "@/services/hrm/notifications";
import type { Project, ProjectMember, ProjectTask, HRMUser, Milestone, TaskComment, TaskAttachment } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Projects Service
// ══════════════════════════════════════════════════════════════════

async function calculateProgressBatch(projectIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (projectIds.length === 0) return map;
  const db = await getDb();
  if (!db) return map;
  const tasks = await db
    .collection("project_tasks")
    .find({ projectId: { $in: projectIds } })
    .project<{ projectId: string; status: string }>({ projectId: 1, status: 1 })
    .toArray();
  return aggregateProgress(projectIds, tasks);
}

function aggregateProgress(
  projectIds: string[],
  tasks: { projectId?: string | null; status: string }[]
): Map<string, number> {
  const map = new Map<string, number>();
  const counts = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    if (!t.projectId) continue;
    const c = counts.get(t.projectId) || { total: 0, done: 0 };
    c.total += 1;
    if (t.status === "completed") c.done += 1;
    counts.set(t.projectId, c);
  }
  for (const pid of projectIds) {
    const c = counts.get(pid) || { total: 0, done: 0 };
    map.set(pid, c.total === 0 ? 0 : Math.round((c.done / c.total) * 100));
  }
  return map;
}

/** Single-query dashboard fetch for a user: memberships + projects + tasks → 2 round-trips. */
async function getProjectsForUser(
  tenantId: string,
  userId: string
): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  const memberships = await db
    .collection("project_members")
    .find({ userId })
    .project<{ projectId: string }>({ projectId: 1 })
    .toArray();
  const memberProjectIds = memberships.map((m) => m.projectId);
  const ownedDocs = await db
    .collection("projects")
    .find({ tenantId, ownerId: userId })
    .project<{ _id?: any; id?: string }>({ _id: 1, id: 1 })
    .toArray();
  const ownedIds = ownedDocs
    .map((d) => (d as any).id ?? d._id?.toString())
    .filter((x): x is string => !!x);
  const allIds = Array.from(new Set([...memberProjectIds, ...ownedIds])).filter(Boolean);
  if (allIds.length === 0) return [];

  // Project docs may store their key as `_id` (ObjectId) or a legacy string
  // `id` — match both, otherwise membership lookups silently return nothing.
  const objectIds = allIds
    .filter((id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id)
    .map((id) => new ObjectId(id));
  const idClauses: Record<string, unknown>[] = [];
  if (objectIds.length > 0) idClauses.push({ _id: { $in: objectIds } });
  idClauses.push({ id: { $in: allIds } });

  const [projectDocs, taskDocs] = await Promise.all([
    db.collection("projects").find({ tenantId, $or: idClauses }).toArray(),
    db
      .collection("project_tasks")
      .find({ projectId: { $in: allIds } })
      .project<{ projectId?: string | null; status: string }>({ projectId: 1, status: 1 })
      .toArray(),
  ]);
  const progressMap = aggregateProgress(allIds, taskDocs);
  return projectDocs.map((d) => {
    const { _id, ...rest } = d as any;
    const id = rest.id ?? _id?.toString();
    return { ...rest, id, progress: progressMap.get(id) ?? 0 } as Project;
  });
}

function enrichWithProgress(project: Project, progressMap: Map<string, number>): Project {
  return { ...project, progress: progressMap.get(project.id) ?? 0 };
}

// ── Projects ────────────────────────────────────────────

export async function getProjects(tenantId: string): Promise<Project[]> {
  const projects = await projectsService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
  const progress = await calculateProgressBatch(projects.map((p) => p.id));
  return projects.map((p) => enrichWithProgress(p, progress));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const project = await projectsService.findById(id);
  if (!project) return null;
  const progress = await calculateProgressBatch([id]);
  return enrichWithProgress(project, progress);
}

export async function createProject(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    status: Project["status"];
    priority: Project["priority"];
    ownerId: string;
    budget?: number;
    creatorName?: string;
    creatorRole?: string;
    department?: string;
    memberIds?: string[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Project> {
  const project = await projectsService.create({
    tenantId,
    name: data.name,
    description: data.description || "",
    status: data.status || "planning",
    priority: data.priority || "medium",
    ownerId: data.ownerId,
    budget: data.budget || 0,
    startDate: data.startDate || new Date(),
    endDate: data.endDate || null,
  } as any);

  // ── Business notification chain ──
  // Super admin / HR create → notify managers (+ any pre-added members).
  // Manager creates → notify their department employees.
  const creatorName = data.creatorName || (await getUserName(data.ownerId));
  const isManagerCreator = data.creatorRole === "manager";
  try {
    if (isManagerCreator) {
      // Manager-created project: the whole department should SEE it (become
      // members, so it appears on their projects page) and get notified.
      // Explicit memberIds from the UI are merged in.
      const projectId = ((project as any).id ?? (project as any)._id?.toString() ?? "");
      let audience: string[] = [];
      if (data.department) {
        audience = await getEmployeeIdsByDepartment(tenantId, data.department, data.ownerId);
      } else {
        audience = await getUserIdsByRole(tenantId, "employee", data.ownerId);
      }
      const memberTargets = Array.from(new Set([...audience, ...(data.memberIds || [])]));
      const db = await getDb();
      if (db && memberTargets.length > 0) {
        const existing = await db
          .collection("project_members")
          .find({ projectId, userId: { $in: memberTargets } })
          .project<{ userId: string }>({ userId: 1 })
          .toArray();
        const already = new Set(existing.map((m) => m.userId));
        const toAdd = memberTargets.filter((uid) => !already.has(uid));
        if (toAdd.length > 0) {
          await db.collection("project_members").insertMany(
            toAdd.map((userId) => ({
              tenantId,
              projectId,
              userId,
              role: "member",
              allocationPercentage: 0,
              createdAt: new Date(),
            }))
          );
        }
      }
      await notifyUsers(
        {
          tenantId,
          userIds: memberTargets,
          title: "New Project in Your Department",
          body: `${creatorName} created the project "${data.name}". You are on the team.`,
          type: "general",
          referenceId: projectId,
          referenceType: "project",
        },
        { excludeUserId: data.ownerId }
      );
    } else {
      // Leadership-created project: notify all managers, minus the creator.
      const managers = await getUserIdsByRole(tenantId, "manager", data.ownerId);
      await notifyUsers(
        {
          tenantId,
          userIds: managers,
          title: "New Project Created",
          body: `${creatorName} created the project "${data.name}". Review it and assign your team.`,
          type: "general",
          referenceId: ((project as any).id ?? (project as any)._id?.toString() ?? ""),
          referenceType: "project",
        },
        { excludeUserId: data.ownerId }
      );
    }
    // Explicit members added at creation time are notified individually.
    if (Array.isArray(data.memberIds) && data.memberIds.length > 0) {
      await notifyUsers(
        {
          tenantId,
          userIds: data.memberIds,
          title: "You Were Added to a Project",
          body: `You are a member of "${data.name}".`,
          type: "general",
          referenceId: ((project as any).id ?? (project as any)._id?.toString() ?? ""),
          referenceType: "project",
        },
        { excludeUserId: data.ownerId }
      );
    }
  } catch (err) {
    // Notifications must never block project creation.
    console.error("[projects] notification fan-out failed", err);
  }

  return project;
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project | null> {
  return projectsService.update(id, data as any);
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await Promise.all([
      db.collection("project_tasks").deleteMany({ projectId: id }),
      db.collection("project_members").deleteMany({ projectId: id }),
      db.collection("milestones").deleteMany({ projectId: id }),
    ]);
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
  const progress = await calculateProgressBatch(projects.map((p) => p.id));
  return projects.map((p) => enrichWithProgress(p, progress));
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
  const db = await getDb();
  if (!db) return [];
  // Match both `_id` (ObjectId) and legacy string `id` storage.
  const memberObjectIds = projectIds
    .filter((id) => ObjectId.isValid(id) && String(new ObjectId(id)) === id)
    .map((id) => new ObjectId(id));
  const memberClauses: Record<string, unknown>[] = [];
  if (memberObjectIds.length > 0) memberClauses.push({ _id: { $in: memberObjectIds } });
  memberClauses.push({ id: { $in: projectIds } });
  const docs = await db
    .collection("projects")
    .find({ tenantId, $or: memberClauses })
    .toArray();
  const projects = docs.map((d) => {
    const { _id, ...rest } = d as any;
    return { ...rest, id: rest.id ?? _id?.toString() } as Project;
  });
  const progress = await calculateProgressBatch(projects.map((p) => p.id));
  return projects.map((p) => enrichWithProgress(p, progress));
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
    projects = await getProjectsForUser(tenantId, userId);
  } else {
    projects = await getProjects(tenantId);
  }

  const now = new Date();
  const activeProjects = projects.filter(
    (p) => p.status === "in_progress" || p.status === "planning"
  ).length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  let overdueTasks = 0;
  if (projects.length > 0) {
    const db = await getDb();
    if (db) {
      const tasks = await db
        .collection("project_tasks")
        .find({
          projectId: { $in: projects.map((p) => p.id) },
          status: { $ne: "completed" },
        })
        .project<{ dueDate?: Date | null }>({ dueDate: 1 })
        .toArray();
      overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now).length;
    }
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
  if (members.length === 0) return [];

  const db = await getDb();
  if (!db) return members;

  const userIds = members.map((m) => m.userId);
  const objectIds: ObjectId[] = [];
  const stringIds: string[] = [];
  for (const id of userIds) {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) objectIds.push(new ObjectId(id));
    else stringIds.push(id);
  }
  const orClauses: Record<string, unknown>[] = [];
  if (objectIds.length > 0) orClauses.push({ _id: { $in: objectIds } });
  if (stringIds.length > 0) orClauses.push({ id: { $in: stringIds } });
  const users = orClauses.length
    ? await db.collection("users").find({ $or: orClauses }).toArray()
    : [];

  const userMap = new Map<string, HRMUser>();
  for (const u of users) {
    const uid = (u as any).id ?? u._id?.toString();
    if (uid) userMap.set(uid, { ...(u as any), id: uid } as HRMUser);
  }
  return members.map((m) => ({ ...m, user: userMap.get(m.userId) }));
}

export async function addProjectMember(
  tenantId: string,
  data: {
    projectId: string;
    userId: string;
    role: ProjectMember["role"];
    allocationPercentage?: number;
    addedByName?: string;
    actorId?: string;
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

  const member = await projectMembersService.create({
    tenantId,
    projectId: data.projectId,
    userId: data.userId,
    role: data.role || "member",
    allocationPercentage: data.allocationPercentage || 100,
  } as any);

  // Notify the new member so they actually learn they were assigned.
  // The exclusion is the ACTOR (adder), never the recipient.
  try {
    const project = await getProjectById(data.projectId);
    const projectName = project?.name || "a project";
    const addedBy = data.addedByName || "Someone";
    await notifyUsers(
      {
        tenantId,
        userIds: [data.userId],
        title: "You Were Added to a Project",
        body: `${addedBy} added you to "${projectName}".`,
        type: "general",
        referenceId: data.projectId,
        referenceType: "project",
      },
      { excludeUserId: data.actorId }
    );
  } catch (err) {
    console.error("[projects] member notification failed", err);
  }

  return member;
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
    assignerId?: string;
    assignerName?: string;
  }
): Promise<ProjectTask> {
  const task = await projectTasksService.create({
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

  // Notify the assignee — an assignment nobody hears about is not an
  // assignment from the business's point of view. The exclusion is the
  // ACTOR (assigner), never the recipient.
  if (data.assigneeId) {
    try {
      // Business rule: if you are assigned work on a project, you must be able
      // to SEE that project — auto-add the assignee as a member when missing.
      const projectId = (task as any).projectId ? String((task as any).projectId) : "";
      if (projectId) {
        const db = await getDb();
        if (db) {
          const existing = await db
            .collection("project_members")
            .findOne({ projectId, userId: data.assigneeId });
          if (!existing) {
            await db.collection("project_members").insertOne({
              tenantId,
              projectId,
              userId: data.assigneeId,
              role: "member",
              allocationPercentage: 0,
              createdAt: new Date(),
            });
          }
        }
      }

      const assigner = data.assignerName || (data.assignerId ? await getUserName(data.assignerId) : "Someone");
      await notifyUsers(
        {
          tenantId,
          userIds: [data.assigneeId],
          title: "New Task Assigned",
          body: `${assigner} assigned you a task: "${data.title}"`,
          type: "task",
          referenceId: ((task as any).id ?? (task as any)._id?.toString() ?? ""),
          referenceType: "task",
        },
        { excludeUserId: data.assignerId }
      );
    } catch (err) {
      console.error("[projects] task assignment notification failed", err);
    }
  }

  return task;
}

export async function updateProjectTask(
  id: string,
  data: Partial<ProjectTask>,
  context?: { actorId?: string; actorName?: string }
): Promise<ProjectTask | null> {
  const before = await getTaskById(id);
  const updateData: Partial<ProjectTask> = { ...data };
  if (data.status === "completed" && !data.completedAt) {
    updateData.completedAt = new Date();
  }
  const updated = await projectTasksService.update(id, updateData as any);

  // Status-transition notifications: the project owner (usually the manager)
  // learns when an assignee advances/completes a task. Skip when the actor
  // IS the owner.
  if (updated && before && data.status && data.status !== (before as any).status) {
    try {
      const project = (before as any).projectId ? await getProjectById(String((before as any).projectId)) : null;
      const ownerId = project ? (project as any).ownerId : undefined;
      const actorName = context?.actorName || (context?.actorId ? await getUserName(context.actorId) : "Someone");
      if (ownerId && ownerId !== context?.actorId) {
        await notifyUsers({
          tenantId: (updated as any).tenantId || "default",
          userIds: [ownerId],
          title: data.status === "completed" ? "Task Completed" : "Task Status Updated",
          body: `${actorName} moved "${(before as any).title}" to ${String(data.status).replace("_", " ")}.`,
          type: "task",
          referenceId: id,
          referenceType: "task",
        });
      }
    } catch (err) {
      console.error("[projects] status-change notification failed", err);
    }
  }

  return updated;
}

export async function deleteProjectTask(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await Promise.all([
      db.collection("task_comments").deleteMany({ taskId: id }),
      db.collection("task_attachments").deleteMany({ taskId: id }),
    ]);
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
