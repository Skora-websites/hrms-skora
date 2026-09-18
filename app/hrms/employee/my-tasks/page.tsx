"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, CheckCircle2, Loader2, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

// ── HRM task shape (matches /api/hrm/v2/projects?type=task) ──
interface HRMTask {
  id?: string;
  _id?: string;
  projectId: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  assigneeId?: string;
  dueDate?: string | null;
  estimatedHours?: number;
}

const STATUS_COLUMNS: { key: HRMTask["status"]; label: string; style: string }[] = [
  { key: "todo", label: "To Do", style: "border-slate-400 text-slate-700 dark:text-slate-300" },
  { key: "in_progress", label: "In Progress", style: "border-blue-500 text-blue-600 dark:text-blue-400" },
  { key: "review", label: "In Review", style: "border-yellow-500 text-yellow-700 dark:text-yellow-400" },
  { key: "completed", label: "Done", style: "border-emerald-500 text-emerald-600 dark:text-emerald-400" },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function EmployeeMyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HRMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      // HRM project tasks — the route scopes the list to the authenticated
      // employee's own assignments.
      const res = await fetch("/api/hrm/v2/projects?type=task");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Employees advance their own tasks via the assignee status transition
  // (?type=task&taskId=… PATCH). The server notifies the project owner.
  const moveTask = async (task: HRMTask, status: HRMTask["status"]) => {
    const taskId = task.id || task._id;
    if (!taskId || status === task.status) return;
    setMovingId(taskId);
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId || t._id === taskId ? { ...t, status } : t)));
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=task&taskId=${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        flash(err.error || "Could not update task");
        // Revert on failure
        setTasks((prev) => prev.map((t) => (t.id === taskId || t._id === taskId ? { ...t, status: task.status } : t)));
      } else {
        flash(`Task moved to ${STATUS_COLUMNS.find((c) => c.key === status)?.label}`);
      }
    } catch {
      flash("Network error");
      setTasks((prev) => prev.map((t) => (t.id === taskId || t._id === taskId ? { ...t, status: task.status } : t)));
    }
    setMovingId(null);
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "completed").length;
  const active = tasks.filter((t) => t.status === "in_progress" || t.status === "review").length;

  return (
    <AppShell title="My Tasks">
      {msg && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {msg}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {total} assigned &middot; {active} in flight &middot; {done} completed &middot; drag-free: use the arrows to
          move tasks
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks...
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-10 text-center">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-900 dark:text-white text-sm">No tasks assigned yet</p>
          <p className="text-xs text-slate-500 mt-1">
            When your manager or HR assigns you a project task, it appears here and you get a notification.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#070B14]/80 p-4 min-h-[300px] text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-white/10">
                  <span className={`font-bold text-sm ${col.style}`}>{col.label}</span>
                  <span className="rounded-full bg-white dark:bg-white/10 border border-gray-200 dark:border-transparent px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex-1 space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border border-dashed border-gray-300 dark:border-white/10 rounded-xl text-xs text-slate-500">
                      Nothing here
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const taskId = task.id || task._id || "";
                      const nextStatuses = STATUS_COLUMNS.filter((c) => c.key !== task.status);
                      return (
                        <div
                          key={taskId}
                          className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-3 shadow-sm hover:border-primary/40 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
                              }`}
                            >
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-2">
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                            {task.estimatedHours ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.estimatedHours}h
                              </span>
                            ) : null}
                          </div>
                          {movingId === taskId ? (
                            <div className="flex justify-center py-1">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100 dark:border-white/5">
                              {nextStatuses.map((ns) => (
                                <button
                                  key={ns.key}
                                  type="button"
                                  onClick={() => moveTask(task, ns.key)}
                                  className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                                >
                                  → {ns.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keep the add-task affordance for personal task creation via PMS actions */}
      <EmployeePersonalTaskCreator onCreated={() => fetchTasks()} />
    </AppShell>
  );
}

function EmployeePersonalTaskCreator({ onCreated }: { onCreated: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
      <span>
        Need a personal to-do that isn&apos;t a project task? Use the{" "}
        <a href="/hrms/tasks" className="text-primary font-semibold hover:underline">
          Tasks board
        </a>
        .
      </span>
      <Button variant="outline" size="sm" onClick={onCreated} className="text-xs">
        Refresh
      </Button>
    </div>
  );
}
