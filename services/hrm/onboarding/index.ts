import "server-only";
import {
  onboardingService,
  employeeOnboardingTasksService,
} from "@/lib/hrm/firestore";
import type {
  Onboarding,
  EmployeeOnboardingTask,
  OnboardingTask,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Onboarding Service
// ══════════════════════════════════════════════════════════════════

export async function getOnboardingPrograms(tenantId: string): Promise<Onboarding[]> {
  return onboardingService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getOnboardingById(id: string): Promise<Onboarding | null> {
  return onboardingService.findById(id);
}

export async function createOnboardingProgram(
  tenantId: string,
  data: {
    name: string;
    description?: string;
    departmentId?: string;
    designationId?: string;
    tasks: OnboardingTask[];
    isDefault?: boolean;
  }
): Promise<Onboarding> {
  return onboardingService.create({
    ...data,
    isDefault: data.isDefault || false,
    status: "active",
    tenantId,
  } as any);
}

export async function updateOnboardingProgram(
  id: string,
  data: Partial<Onboarding>
): Promise<Onboarding | null> {
  return onboardingService.update(id, data as any);
}

export async function deleteOnboardingProgram(id: string): Promise<boolean> {
  return onboardingService.delete(id);
}

// ── Employee Onboarding Tasks ──────────────────────────

export async function initiateEmployeeOnboarding(
  tenantId: string,
  onboardingId: string,
  userId: string
): Promise<EmployeeOnboardingTask[]> {
  const program = await onboardingService.findById(onboardingId);
  if (!program) throw new Error("Onboarding program not found");

  const createdTasks: EmployeeOnboardingTask[] = [];

  for (const task of program.tasks) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + task.dueDaysAfterJoining);

    const createdTask = await employeeOnboardingTasksService.create({
      onboardingId,
      userId,
      taskId: task.id,
      title: task.title,
      assignedTo: task.assignedTo,
      status: "pending",
      dueDate,
      tenantId,
    } as any);

    createdTasks.push(createdTask);
  }

  return createdTasks;
}

export async function getEmployeeOnboardingTasks(
  tenantId: string,
  userId: string
): Promise<EmployeeOnboardingTask[]> {
  return employeeOnboardingTasksService.findManyInTenant(tenantId, {
    where: [{ field: "userId", op: "==", value: userId }],
    orderByField: "dueDate",
    orderByDirection: "asc",
  });
}

export async function updateOnboardingTaskStatus(
  id: string,
  status: EmployeeOnboardingTask["status"],
  completedById?: string
): Promise<EmployeeOnboardingTask | null> {
  const updateData: Partial<EmployeeOnboardingTask> = { status };
  if (status === "completed") {
    updateData.completedAt = new Date();
    updateData.completedById = completedById;
  }
  return employeeOnboardingTasksService.update(id, updateData as any);
}

export async function getPendingOnboardingTasks(
  tenantId: string
): Promise<EmployeeOnboardingTask[]> {
  return employeeOnboardingTasksService.findManyInTenant(tenantId, {
    where: [
      { field: "status", op: "==", value: "pending" },
    ],
    orderByField: "dueDate",
    orderByDirection: "asc",
  });
}

// ── Dashboard ──────────────────────────────────────────

export async function getOnboardingDashboard(tenantId: string): Promise<{
  totalPrograms: number;
  activeOnboardings: number;
  pendingTasks: number;
  overdueTasks: number;
}> {
  const [programs, pendingTasks] = await Promise.all([
    getOnboardingPrograms(tenantId),
    getPendingOnboardingTasks(tenantId),
  ]);

  return {
    totalPrograms: programs.length,
    activeOnboardings: programs.filter((p) => p.status === "active").length,
    pendingTasks: pendingTasks.length,
    overdueTasks: pendingTasks.filter(
      (t) => new Date(t.dueDate as any) < new Date()
    ).length,
  };
}
