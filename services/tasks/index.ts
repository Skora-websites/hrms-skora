import "server-only";
import {
  hrmTasksService,
  hrmTaskCommentsService,
  taskAuditLogsService,
} from "@/lib/hrm/firestore";
import { sendNotification } from "@/services/hrm/notifications";
import type { HRMTask, HRMTaskComment, TaskAuditLog } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Tasks Service
// ══════════════════════════════════════════════════════════════════

// ── Tasks ──────────────────────────────────────────────

export async function getTasks(
  tenantId: string,
  options: {
    assigneeId?: string;
    departmentId?: string;
    status?: string;
    priority?: string;
    search?: string;
  } = {}
): Promise<HRMTask[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.assigneeId) {
    where.push({ field: "assigneeId", op: "==", value: options.assigneeId });
  }
  if (options.departmentId) {
    where.push({ field: "departmentId", op: "==", value: options.departmentId });
  }
  if (options.status) {
    where.push({ field: "status", op: "==", value: options.status });
  }
  if (options.priority) {
    where.push({ field: "priority", op: "==", value: options.priority });
  }

  return hrmTasksService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

export async function getTaskById(id: string): Promise<HRMTask | null> {
  return hrmTasksService.findById(id);
}

export async function createTask(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    priority: HRMTask["priority"];
    assigneeId?: string;
    assigneeName?: string;
    assignerId: string;
    assignerName: string;
    departmentId?: string;
    dueDate?: Date;
    tags?: string[];
  }
): Promise<HRMTask> {
  const task = await hrmTasksService.create({
    tenantId,
    title: data.title,
    description: data.description || "",
    status: "pending",
    priority: data.priority || "medium",
    assigneeId: data.assigneeId || "",
    assigneeName: data.assigneeName || "",
    assignerId: data.assignerId,
    assignerName: data.assignerName,
    departmentId: data.departmentId || "",
    dueDate: data.dueDate || null,
    progress: 0,
    tags: data.tags || [],
    completedAt: null,
    completedById: null,
    notes: "",
    attachments: [],
  } as any);

  // Record audit log
  await createTaskAuditLog(tenantId, {
    taskId: task.id,
    action: "created",
    performedById: data.assignerId,
    performedByName: data.assignerName,
    newValue: "pending",
    details: `Task "${data.title}" created`,
  });

  // Notify assignee
  if (data.assigneeId) {
    await sendNotification({
      tenantId,
      userId: data.assigneeId,
      title: "New Task Assigned",
      body: `You have been assigned a new task: "${data.title}"`,
      type: "task",
      referenceId: task.id,
      referenceType: "task",
    });
  }

  return task;
}

export async function updateTask(
  id: string,
  data: Partial<HRMTask>,
  performedById?: string,
  performedByName?: string
): Promise<HRMTask | null> {
  const oldTask = await hrmTasksService.findById(id);
  if (!oldTask) return null;

  const updateData: Partial<HRMTask> = { ...data };

  // Auto-set completed timestamp
  if (data.status === "completed" && !data.completedAt) {
    updateData.completedAt = new Date() as any;
    updateData.completedById = performedById;
    updateData.progress = 100;
  }

  // Auto-set progress when completing
  if (data.status === "completed" && !data.progress) {
    updateData.progress = 100;
  }

  const updated = await hrmTasksService.update(id, updateData as any);
  if (!updated) return null;

  // Record audit log for status changes
  if (data.status && data.status !== oldTask.status) {
    await createTaskAuditLog(oldTask.tenantId, {
      taskId: id,
      action: data.status === "completed" ? "completed" : "status_updated",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTask.status,
      newValue: data.status,
      details: `Status changed from ${oldTask.status} to ${data.status}`,
    });

    // Notify assignee about status update
    if (oldTask.assigneeId && performedById !== oldTask.assigneeId) {
      await sendNotification({
        tenantId: oldTask.tenantId,
        userId: oldTask.assigneeId,
        title: "Task Status Updated",
        body: `Task "${oldTask.title}" status changed to ${data.status}`,
        type: "task",
        referenceId: id,
        referenceType: "task",
      });
    }
  }

  // Notify about reassignment
  if (data.assigneeId && data.assigneeId !== oldTask.assigneeId) {
    await createTaskAuditLog(oldTask.tenantId, {
      taskId: id,
      action: "reassigned",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTask.assigneeName || "Unassigned",
      newValue: data.assigneeName || "Assigned",
      details: `Task reassigned to ${data.assigneeName || "new assignee"}`,
    });

    // Notify new assignee
    if (data.assigneeId) {
      await sendNotification({
        tenantId: oldTask.tenantId,
        userId: data.assigneeId,
        title: "Task Reassigned",
        body: `Task "${oldTask.title}" has been reassigned to you`,
        type: "task",
        referenceId: id,
        referenceType: "task",
      });
    }
  }

  if (data.priority && data.priority !== oldTask.priority) {
    await createTaskAuditLog(oldTask.tenantId, {
      taskId: id,
      action: "priority_updated",
      performedById: performedById || "",
      performedByName: performedByName || "System",
      previousValue: oldTask.priority,
      newValue: data.priority,
      details: `Priority changed from ${oldTask.priority} to ${data.priority}`,
    });
  }

  return updated;
}

export async function deleteTask(id: string): Promise<boolean> {
  // Delete associated comments and audit logs
  const comments = await hrmTaskCommentsService.findMany({
    where: [{ field: "taskId", op: "==", value: id }],
  });
  for (const c of comments) {
    await hrmTaskCommentsService.delete(c.id);
  }

  const logs = await taskAuditLogsService.findMany({
    where: [{ field: "taskId", op: "==", value: id }],
  });
  for (const l of logs) {
    await taskAuditLogsService.delete(l.id);
  }

  return hrmTasksService.delete(id);
}

// ── Task Dashboard Stats ───────────────────────────────

export async function getTaskDashboardStats(
  tenantId: string,
  userId?: string,
  userRole?: string
): Promise<{
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  onHoldTasks: number;
  overdueTasks: number;
  tasks: HRMTask[];
}> {
  const allTasks = userId && userRole === "employee"
    ? await getTasks(tenantId, { assigneeId: userId })
    : await getTasks(tenantId);

  const now = new Date();
  const totalTasks = allTasks.length;
  const pendingTasks = allTasks.filter((t) => t.status === "pending").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const onHoldTasks = allTasks.filter((t) => t.status === "on_hold").length;
  const overdueTasks = allTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed"
  ).length;

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    onHoldTasks,
    overdueTasks,
    tasks: allTasks.slice(0, 10),
  };
}

// ── Task Comments ──────────────────────────────────────

export async function getTaskComments(taskId: string): Promise<HRMTaskComment[]> {
  return hrmTaskCommentsService.findMany({
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
): Promise<HRMTaskComment> {
  const comment = await hrmTaskCommentsService.create({
    tenantId,
    taskId: data.taskId,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    userPhotoURL: data.userPhotoURL || "",
    content: data.content,
  } as any);

  // Record audit log
  await createTaskAuditLog(tenantId, {
    taskId: data.taskId,
    action: "commented",
    performedById: data.userId,
    performedByName: data.userDisplayName,
    details: `Comment added: "${data.content.substring(0, 100)}"`,
  });

  return comment;
}

export async function deleteTaskComment(id: string): Promise<boolean> {
  return hrmTaskCommentsService.delete(id);
}

// ── Task Audit Logs ────────────────────────────────────

export async function getTaskAuditLogs(taskId: string): Promise<TaskAuditLog[]> {
  return taskAuditLogsService.findMany({
    where: [{ field: "taskId", op: "==", value: taskId }],
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}

async function createTaskAuditLog(
  tenantId: string,
  data: {
    taskId: string;
    action: TaskAuditLog["action"];
    performedById: string;
    performedByName: string;
    previousValue?: string;
    newValue?: string;
    details?: string;
  }
): Promise<TaskAuditLog> {
  return taskAuditLogsService.create({
    tenantId,
    taskId: data.taskId,
    action: data.action,
    performedById: data.performedById,
    performedByName: data.performedByName,
    previousValue: data.previousValue || "",
    newValue: data.newValue || "",
    details: data.details || "",
  } as any);
}
