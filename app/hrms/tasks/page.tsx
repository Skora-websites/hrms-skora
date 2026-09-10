"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  PauseCircle,
  MoreHorizontal,
  User,
  Tag,
  Eye,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SummaryCards } from "@/components/shared/summary-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { useTasks, useTaskDashboard } from "@/hooks/hrm/use-tasks";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "danger" as const, icon: AlertCircle },
  high: { label: "High", color: "warning" as const, icon: AlertCircle },
  medium: { label: "Medium", color: "info" as const, icon: Circle },
  low: { label: "Low", color: "success" as const, icon: Circle },
} as const;

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "outline" as const, icon: Circle },
  in_progress: { label: "In Progress", color: "info" as const, icon: Clock },
  completed: { label: "Completed", color: "success" as const, icon: CheckCircle2 },
  on_hold: { label: "On Hold", color: "warning" as const, icon: PauseCircle },
} as const;

export default function TasksPage() {
  const { user } = useAuth();
  const { data: dashboard, loading: dashboardLoading, refetch: refetchDashboard } = useTaskDashboard();
  const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { createRecord, updateRecord, deleteRecord } = useMutation();
  const { success, error } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "admin" || user?.role === "hr_admin" || user?.role === "manager";

  // ── Create Task ──────────────────────────────────────
  const handleCreateTask = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      title: data.get("title") as string,
      description: data.get("description") as string,
      priority: data.get("priority") || "medium",
      assigneeId: data.get("assigneeId") as string,
      assigneeName: data.get("assigneeName") as string,
      dueDate: data.get("dueDate") ? new Date(data.get("dueDate") as string) : undefined,
      tags: (data.get("tags") as string)?.split(",").map((t) => t.trim()).filter(Boolean) || [],
    };

    const result = await createRecord("/api/hrm/v2/tasks", payload);
    if (result) {
      success("Task created", "Task has been created successfully.");
      setShowCreateDialog(false);
      refetchDashboard();
      refetchTasks();
    } else {
      error("Failed to create task");
    }
  }, [createRecord, success, error, refetchDashboard, refetchTasks]);

  // ── Update Task Status ───────────────────────────────
  const handleStatusUpdate = useCallback(async (taskId: string, status: string) => {
    const result = await updateRecord(`/api/hrm/v2/tasks?id=${taskId}`, { status });
    if (result) {
      success("Status updated");
      refetchDashboard();
      refetchTasks();
    }
  }, [updateRecord, success, refetchDashboard, refetchTasks]);

  // ── Delete Task ──────────────────────────────────────
  const handleDeleteTask = useCallback(async (taskId: string) => {
    const result = await deleteRecord(`/api/hrm/v2/tasks?id=${taskId}`);
    if (result) {
      success("Task deleted");
      setShowDeleteConfirm(null);
      refetchDashboard();
      refetchTasks();
    }
  }, [deleteRecord, success, refetchDashboard, refetchTasks]);

  // ── Filters ─────────────────────────────────────────
  const filteredTasks = (tasks || []).filter((task) => {
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || task.status === statusFilter;
    const matchesPriority = !priorityFilter || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = dashboard ? [
    { label: "Total Tasks", value: dashboard.totalTasks },
    { label: "Pending", value: dashboard.pendingTasks },
    { label: "In Progress", value: dashboard.inProgressTasks },
    { label: "Completed", value: dashboard.completedTasks },
    { label: "Overdue", value: dashboard.overdueTasks },
  ] : [];

  // ── Task Detail Dialog ───────────────────────────────
  const detailTask = showDetailDialog ? tasks?.find((t) => t.id === showDetailDialog) : null;

  // ── Edit Task Dialog ─────────────────────────────────
  const editTask = showEditDialog ? tasks?.find((t) => t.id === showEditDialog) : null;

  return (
    <AppShell title="Task Management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-h3 text-dark dark:text-white font-bold tracking-tighter">
            Task Management
          </h2>
          <p className="mt-1 text-sm text-muted">
            Create, assign, and track tasks across the organization
          </p>
        </div>
        {isAdmin && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Title *</label>
                  <Input name="title" required placeholder="Enter task title" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                    placeholder="Describe the task..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Priority</label>
                    <select
                      name="priority"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      defaultValue="medium"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Due Date</label>
                    <Input name="dueDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Assign To (ID)</label>
                    <Input name="assigneeId" placeholder="User ID" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Assignee Name</label>
                    <Input name="assigneeName" placeholder="Full name" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tags (comma separated)</label>
                  <Input name="tags" placeholder="e.g. design, urgent, frontend" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Task</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <SummaryCards
          cards={stats}
          loading={dashboardLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={statusFilter || ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={priorityFilter || ""}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {tasksLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={Circle}
          title="No tasks found"
          description={
            searchQuery || statusFilter || priorityFilter
              ? "Try adjusting your filters"
              : "Create your first task to get started"
          }
          action={
            isAdmin ? {
              label: "Create Task",
              onClick: () => setShowCreateDialog(true),
            } : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const PriorityIcon = PRIORITY_CONFIG[task.priority]?.icon || Circle;
            const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;

            return (
              <div
                key={task.id}
                className="group rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <button
                    onClick={() => {
                      if (!isAdmin && task.assigneeId !== user?.id) return;
                      const nextStatus = task.status === "pending" ? "in_progress"
                        : task.status === "in_progress" ? "completed"
                        : task.status === "completed" ? "on_hold"
                        : "pending";
                      handleStatusUpdate(task.id, nextStatus);
                    }}
                    className="mt-0.5 shrink-0"
                    title="Toggle status"
                  >
                    <StatusIcon className={cn(
                      "h-5 w-5 transition-colors",
                      task.status === "completed" ? "text-success" :
                      task.status === "in_progress" ? "text-info" :
                      task.status === "on_hold" ? "text-warning" :
                      "text-muted/40"
                    )} />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className={cn(
                          "font-semibold text-dark dark:text-white",
                          task.status === "completed" && "line-through text-muted"
                        )}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-muted mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={PRIORITY_CONFIG[task.priority]?.color} size="sm">
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {PRIORITY_CONFIG[task.priority]?.label}
                        </Badge>
                        <Badge variant={STATUS_CONFIG[task.status]?.color} size="sm">
                          {STATUS_CONFIG[task.status]?.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted">
                      {task.assigneeName && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assigneeName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={cn(
                          "flex items-center gap-1",
                          new Date(task.dueDate) < new Date() && task.status !== "completed" && "text-danger"
                        )}>
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {task.tags.slice(0, 3).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 w-full max-w-[200px] rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          task.progress === 100 ? "bg-success" :
                          task.progress >= 50 ? "bg-info" :
                          "bg-warning"
                        )}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setShowDetailDialog(task.id)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {(isAdmin || task.assigneeId === user?.id) && (
                        <>
                          <DropdownMenuItem onClick={() => setShowEditDialog(task.id)}>
                            <Edit3 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-danger"
                            onClick={() => setShowDeleteConfirm(task.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!showDetailDialog} onOpenChange={(o) => !o && setShowDetailDialog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailTask?.title || "Task Details"}</DialogTitle>
          </DialogHeader>
          {detailTask && (
            <div className="space-y-4 mt-2">
              {detailTask.description && (
                <p className="text-sm text-muted">{detailTask.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted">Status:</span>{" "}
                  <Badge variant={STATUS_CONFIG[detailTask.status]?.color} size="sm">
                    {STATUS_CONFIG[detailTask.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted">Priority:</span>{" "}
                  <Badge variant={PRIORITY_CONFIG[detailTask.priority]?.color} size="sm">
                    {PRIORITY_CONFIG[detailTask.priority]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted">Assignee:</span>{" "}
                  {detailTask.assigneeName || "Unassigned"}
                </div>
                <div>
                  <span className="text-muted">Due Date:</span>{" "}
                  {detailTask.dueDate ? new Date(detailTask.dueDate).toLocaleDateString() : "No due date"}
                </div>
                <div>
                  <span className="text-muted">Progress:</span> {detailTask.progress}%
                </div>
                <div>
                  <span className="text-muted">Created:</span>{" "}
                  {new Date(detailTask.createdAt).toLocaleDateString()}
                </div>
              </div>
              {detailTask.tags && detailTask.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {detailTask.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" size="sm">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={(o) => !o && setShowEditDialog(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editTask && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = new FormData(form);
                const payload: Record<string, unknown> = {};
                const title = data.get("title") as string;
                if (title) payload.title = title;
                const description = data.get("description") as string;
                if (description) payload.description = description;
                payload.priority = data.get("priority") || editTask.priority;
                payload.status = data.get("status") || editTask.status;
                payload.assigneeId = data.get("assigneeId") || editTask.assigneeId;
                payload.assigneeName = data.get("assigneeName") || editTask.assigneeName;
                payload.dueDate = data.get("dueDate") ? new Date(data.get("dueDate") as string) : editTask.dueDate;

                const result = await updateRecord(`/api/hrm/v2/tasks?id=${editTask.id}`, payload);
                if (result) {
                  success("Task updated");
                  setShowEditDialog(null);
                  refetchDashboard();
                  refetchTasks();
                }
              }}
              className="space-y-4 mt-4"
            >
              <div>
                <label className="text-sm font-medium block mb-1">Title</label>
                <Input name="title" defaultValue={editTask.title} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
                  defaultValue={editTask.description || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Priority</label>
                  <select
                    name="priority"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    defaultValue={editTask.priority}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Status</label>
                  <select
                    name="status"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    defaultValue={editTask.status}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Assignee ID</label>
                  <Input name="assigneeId" defaultValue={editTask.assigneeId || ""} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Assignee Name</label>
                  <Input name="assigneeName" defaultValue={editTask.assigneeName || ""} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Due Date</label>
                <Input
                  name="dueDate"
                  type="date"
                  defaultValue={editTask.dueDate ? new Date(editTask.dueDate).toISOString().split("T")[0] : ""}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted">Are you sure you want to delete this task? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => showDeleteConfirm && handleDeleteTask(showDeleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
