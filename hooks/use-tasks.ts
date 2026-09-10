"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { HRMTask, TaskComment, TaskAuditLog } from "@/types";

// ── Task Hooks ─────────────────────────────────────────

export function useTasks(params?: Record<string, string>) {
  return useCollection<HRMTask>("/api/hrm/v2/tasks", params);
}

export function useTask(id: string | null) {
  return useFirestoreQuery<HRMTask>(
    id ? `/api/hrm/v2/tasks?id=${id}` : null
  );
}

export function useTaskDashboard() {
  return useFirestoreQuery<{
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    onHoldTasks: number;
    overdueTasks: number;
    tasks: HRMTask[];
  }>("/api/hrm/v2/tasks?dashboard=true");
}

// ── Comment Hooks ──────────────────────────────────────

export function useTaskComments(taskId: string | null) {
  return useCollection<TaskComment>(
    taskId ? `/api/hrm/v2/tasks?comments=true&taskId=${taskId}` : null
  );
}

// ── Audit Log Hooks ────────────────────────────────────

export function useTaskAuditLogs(taskId: string | null) {
  return useCollection<TaskAuditLog>(
    taskId ? `/api/hrm/v2/tasks?auditLogs=true&taskId=${taskId}` : null
  );
}
