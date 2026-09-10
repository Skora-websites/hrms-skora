"use server";

import { updateTaskStatus, createTask, TaskStatus, TaskPriority } from "@/lib/db/tasks";
import { createProject } from "@/lib/db/projects";
import { createTimesheet, updateTimesheetStatus, TimesheetStatus } from "@/lib/db/timesheets";
import { revalidatePath } from "next/cache";

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  try {
    const success = await updateTaskStatus(taskId, status);
    if (success) {
      revalidatePath("/hrms/projects");
      revalidatePath("/hrms/manager");
      revalidatePath("/hrms/employee/my-tasks");
    }
    return { success };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createProjectAction(data: {
  name: string;
  description?: string;
  clientName?: string;
  budget?: number;
  managerId: string;
  managerName?: string;
  startDate: string;
  endDate?: string;
}) {
  try {
    const project = await createProject({
      ...data,
      status: "ACTIVE",
    });
    revalidatePath("/hrms/projects");
    revalidatePath("/hrms/manager");
    return { success: true, project };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function createTaskAction(data: {
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName?: string;
  dueDate?: string;
  estimatedHours?: number;
}) {
  try {
    const task = await createTask({
      ...data,
      status: "TODO",
    });
    revalidatePath("/hrms/projects");
    revalidatePath("/hrms/manager");
    revalidatePath("/hrms/employee/my-tasks");
    return { success: true, task };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function logTimesheetAction(data: {
  taskId: string;
  taskTitle?: string;
  projectId: string;
  projectName?: string;
  userId: string;
  userName?: string;
  date: string;
  hours: number;
  billable: boolean;
  notes?: string;
  isPunchedIn?: boolean; // Validation gate check flag
}) {
  try {
    // Cross-module validation gate check: Employee must be punched in or have valid attendance record
    if (data.isPunchedIn === false) {
      return {
        success: false,
        error: "Attendance Validation Failed: You must be Punched In for today before logging project timesheet hours.",
      };
    }

    const entry = await createTimesheet({
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      projectId: data.projectId,
      projectName: data.projectName,
      userId: data.userId,
      userName: data.userName,
      date: data.date,
      hours: Number(data.hours),
      billable: Boolean(data.billable),
      notes: data.notes || "",
      status: "PENDING",
    });

    revalidatePath("/hrms/employee/timesheet");
    revalidatePath("/hrms/manager");
    revalidatePath("/hrms/projects");
    return { success: true, entry };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function approveTimesheetAction(timesheetId: string, managerId: string) {
  try {
    const success = await updateTimesheetStatus(timesheetId, "APPROVED", managerId);
    revalidatePath("/hrms/manager");
    revalidatePath("/hrms/employee/timesheet");
    return { success };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function rejectTimesheetAction(timesheetId: string, managerId: string, reason: string) {
  try {
    const success = await updateTimesheetStatus(timesheetId, "REJECTED", managerId, reason);
    revalidatePath("/hrms/manager");
    revalidatePath("/hrms/employee/timesheet");
    return { success };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
