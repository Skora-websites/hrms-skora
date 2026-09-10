"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Project, ProjectTask, ProjectMember, Milestone, TaskComment, TaskAttachment } from "@/types";

// ── Project Hooks ───────────────────────────────────────

export function useProjects(params?: Record<string, string>) {
  return useCollection<Project>("/api/hrm/v2/projects", params);
}

export function useProject(id: string | null) {
  return useFirestoreQuery<Project>(
    id ? `/api/hrm/v2/projects?id=${id}` : null
  );
}

export function useProjectDashboard() {
  return useFirestoreQuery<{
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    overdueTasks: number;
    projects: Project[];
  }>("/api/hrm/v2/projects?dashboard=true");
}

// ── Task Hooks ──────────────────────────────────────────

export function useProjectTasks(
  projectId?: string,
  assigneeId?: string
) {
  const params: Record<string, string> = { type: "task" };
  if (projectId) params.projectId = projectId;
  if (assigneeId) params.assigneeId = assigneeId;

  const queryString = "?" + new URLSearchParams(params).toString();
  return useCollection<ProjectTask>(
    `/api/hrm/v2/projects${queryString}`
  );
}

export function useTask(id: string | null) {
  return useFirestoreQuery<ProjectTask>(
    id ? `/api/hrm/v2/projects?type=task&taskId=${id}` : null
  );
}

export function useKanbanBoard(projectId?: string) {
  const params: Record<string, string> = { kanban: "true" };
  if (projectId) params.projectId = projectId;

  const queryString = "?" + new URLSearchParams(params).toString();
  return useFirestoreQuery<Record<string, ProjectTask[]>>(
    `/api/hrm/v2/projects${queryString}`
  );
}

// ── Member Hooks ────────────────────────────────────────

export function useProjectMembers(projectId: string | null) {
  return useFirestoreQuery<(ProjectMember & { user?: { displayName: string; photoURL?: string } })[]>(
    projectId ? `/api/hrm/v2/projects?members=true&projectId=${projectId}` : null
  );
}

// ── Milestone Hooks ─────────────────────────────────────

export function useMilestones(projectId?: string) {
  const params: Record<string, string> = { milestones: "true" };
  if (projectId) params.projectId = projectId;
  const qs = "?" + new URLSearchParams(params).toString();
  return useCollection<Milestone>(`/api/hrm/v2/projects${qs}`);
}

// ── Comment Hooks ───────────────────────────────────────

export function useTaskComments(taskId: string | null) {
  return useCollection<TaskComment>(
    taskId ? `/api/hrm/v2/projects?comments=true&taskId=${taskId}` : null
  );
}

// ── Attachment Hooks ────────────────────────────────────

export function useTaskAttachments(taskId: string | null) {
  return useCollection<TaskAttachment>(
    taskId ? `/api/hrm/v2/projects?attachments=true&taskId=${taskId}` : null
  );
}
