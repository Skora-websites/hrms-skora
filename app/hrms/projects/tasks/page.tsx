"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Plus,
  Edit3,
  Trash2,
  GripVertical,
  Clock,
  AlertCircle,
  User,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Send,
  FileText,
  Download,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { useProjects, useProjectTasks } from "@/hooks/hrm";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

// ── Types ───────────────────────────────────────────────

interface TaskData {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  status: "todo" | "in_progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "critical";
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
}

// ── Constants ───────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "completed", label: "Completed" },
];

const KANBAN_COLUMNS = [
  { key: "todo" as const, label: "To Do", color: "bg-gray-100 dark:bg-gray-800/50" },
  { key: "in_progress" as const, label: "In Progress", color: "bg-amber-50 dark:bg-amber-900/20" },
  { key: "review" as const, label: "Review", color: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "completed" as const, label: "Completed", color: "bg-green-50 dark:bg-green-900/20" },
];

const priorityColors: Record<string, string> = {
  low: "text-blue-500 bg-blue-500/10",
  medium: "text-amber-500 bg-amber-500/10",
  high: "text-orange-500 bg-orange-500/10",
  critical: "text-danger bg-danger/10",
};

const EMPTY_TASK_FORM = {
  projectId: "",
  title: "",
  description: "",
  assigneeId: "",
  priority: "medium" as TaskData["priority"],
  status: "todo" as TaskData["status"],
  dueDate: "",
  estimatedHours: 0,
};

// ── Component ───────────────────────────────────────────

export default function TasksPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const toast = useToast();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Comments state
  const [viewingTask, setViewingTask] = useState<TaskData | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; userDisplayName: string; createdAt: string }[]>([]);
  const [attachments, setAttachments] = useState<{ id: string; fileName: string; fileSize: number; fileType: string; fileURL: string }[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [attachmentURL, setAttachmentURL] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [submittingAttachment, setSubmittingAttachment] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: "task" });
      if (selectedProject) params.set("projectId", selectedProject);
      const res = await fetch(`/api/hrm/v2/projects?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      setTasks(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const kanbanData = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    review: tasks.filter((t) => t.status === "review"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setTaskForm({
      ...EMPTY_TASK_FORM,
      projectId: selectedProject || (projects?.[0]?.id || ""),
    });
    setShowDialog(true);
  };

  const openEditDialog = (task: TaskData) => {
    setEditingTask(task);
    setTaskForm({
      projectId: task.projectId,
      title: task.title,
      description: task.description || "",
      assigneeId: task.assigneeId || "",
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      estimatedHours: task.estimatedHours || 0,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTask(null);
    setTaskForm(EMPTY_TASK_FORM);
  };

  const handleSave = async () => {
    if (!taskForm.title.trim() || !taskForm.projectId) return;
    setSaving(true);
    try {
      const url = editingTask
        ? `/api/hrm/v2/projects?type=task&taskId=${editingTask.id}`
        : "/api/hrm/v2/projects?type=task";
      const method = editingTask ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save task");
      }
      toast.success(
        editingTask ? "Task Updated" : "Task Created",
        `"${taskForm.title}" has been saved.`
      );
      closeDialog();
      fetchTasks();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=task&taskId=${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task status");
      fetchTasks();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  // ── Comment & Attachment Handlers ─────────────────────

  const fetchComments = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/projects?comments=true&taskId=${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      setComments(json.data || []);
    } catch {
      setComments([]);
    }
  }, []);

  const fetchAttachments = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/projects?attachments=true&taskId=${taskId}`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      const json = await res.json();
      setAttachments(json.data || []);
    } catch {
      setAttachments([]);
    }
  }, []);

  const openDetailDialog = (task: TaskData) => {
    setViewingTask(task);
    setShowDetailDialog(true);
    fetchComments(task.id);
    fetchAttachments(task.id);
    setNewComment("");
    setAttachmentURL("");
    setAttachmentName("");
  };

  const closeDetailDialog = () => {
    setShowDetailDialog(false);
    setViewingTask(null);
    setComments([]);
    setAttachments([]);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !viewingTask) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/hrm/v2/projects?action=comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: viewingTask.id, content: newComment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment("");
      fetchComments(viewingTask.id);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddAttachment = async () => {
    if (!attachmentURL.trim() || !attachmentName.trim() || !viewingTask) return;
    setSubmittingAttachment(true);
    try {
      const res = await fetch("/api/hrm/v2/projects?action=attachment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: viewingTask.id,
          fileName: attachmentName,
          fileURL: attachmentURL,
          fileSize: 0,
          fileType: attachmentName.split(".").pop() || "unknown",
        }),
      });
      if (!res.ok) throw new Error("Failed to add attachment");
      setAttachmentURL("");
      setAttachmentName("");
      fetchAttachments(viewingTask.id);
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSubmittingAttachment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=comment&commentId=${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete comment");
      if (viewingTask) fetchComments(viewingTask.id);
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=attachment&attachmentId=${attachmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete attachment");
      if (viewingTask) fetchAttachments(viewingTask.id);
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=task&taskId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      toast.success("Task Deleted", "Task has been deleted.");
      fetchTasks();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setDeleting(null);
    }
  };

  // ── Render ───────────────────────────────────────────

  return (
    <AppShell title="Kanban Board">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
              <Toast variant={t.variant} message={t.message} description={t.description} onClose={() => toast.dismissToast(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="Kanban Board" description="Drag and drop tasks to update their status.">
        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </PageHeader>

      {error ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-dark dark:text-white font-semibold">Failed to load tasks</p>
          <p className="text-sm text-muted mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchTasks}>Try Again</Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <Card key={col.key}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((column) => (
            <div key={column.key}>
              <Card>
                <CardHeader className={`pb-2 ${column.color} rounded-t-xl`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{column.label}</CardTitle>
                    <span className="text-xs font-bold text-muted bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full">
                      {kanbanData[column.key].length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3 min-h-[200px]">
                  {kanbanData[column.key].length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted">No tasks</p>
                    </div>
                  ) : (
                    kanbanData[column.key].map((task, idx) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}                          className="bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
                        onClick={() => openDetailDialog(task)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-dark dark:text-white leading-tight">{task.title}</p>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditDialog(task); }}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Edit3 className="h-3 w-3 text-muted" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                              className="p-1 rounded hover:bg-danger/10"
                            >
                              <Trash2 className="h-3 w-3 text-danger" />
                            </button>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${priorityColors[task.priority] || "text-muted"}`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Quick status change buttons */}
                        {column.key !== "completed" && (
                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                            {STATUS_OPTIONS.filter((s) => s.value !== task.status).map((s) => (
                              <button
                                key={s.value}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, s.value); }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* ── Task Detail Dialog with Comments & Attachments ── */}
      <Dialog open={showDetailDialog} onOpenChange={(open) => { if (!open) closeDetailDialog(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>{viewingTask?.title || "Task Details"}</DialogTitle>
                <DialogDescription>
                  View task details, comments, and attachments.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6">
            {/* Task Info */}
            {viewingTask && (
              <div className="flex flex-wrap gap-2">
                <Badge variant={viewingTask.status === "completed" ? "success" : viewingTask.status === "in_progress" ? "warning" : "info"} size="sm">
                  {viewingTask.status.replace("_", " ")}
                </Badge>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${priorityColors[viewingTask.priority] || "text-muted"}`}>
                  {viewingTask.priority}
                </span>
                {viewingTask.dueDate && (
                  <span className="text-xs text-muted flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> Due: {new Date(viewingTask.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            {viewingTask?.description && (
              <p className="text-sm text-muted bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3">{viewingTask.description}</p>
            )}

            <Separator />

            {/* Quick edit buttons */}
            {viewingTask && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="xs" onClick={() => { closeDetailDialog(); openEditDialog(viewingTask); }}>
                  <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Task
                </Button>
              </div>
            )}

            {/* ── Attachments ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted" />
                  Attachments ({attachments.length})
                </p>
              </div>

              {/* Add attachment form */}
              {viewingTask && (
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    placeholder="File name..."
                    className="flex-1 max-w-[180px] text-sm"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                  />
                  <Input
                    placeholder="Paste file URL..."
                    className="flex-1 text-sm"
                    value={attachmentURL}
                    onChange={(e) => setAttachmentURL(e.target.value)}
                  />
                  <Button size="xs" onClick={handleAddAttachment} loading={submittingAttachment} disabled={!attachmentURL || !attachmentName}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {attachments.length === 0 ? (
                <p className="text-xs text-muted italic">No attachments yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/30 group hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                      <a
                        href={att.fileURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors min-w-0"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{att.fileName}</span>
                        <span className="text-xs text-muted shrink-0">({att.fileType})</span>
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1 rounded hover:bg-danger/10 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Comments ── */}
            <div>
              <p className="text-sm font-semibold text-dark dark:text-white flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted" />
                Comments ({comments.length})
              </p>

              {/* Add comment */}
              {viewingTask && (
                <div className="flex items-start gap-2 mb-4">
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-dark dark:text-white placeholder:text-muted focus:border-primary focus:outline-none resize-none"
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    />
                  </div>
                  <Button size="xs" onClick={handleAddComment} loading={submittingComment} disabled={!newComment.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {comments.length === 0 ? (
                <p className="text-xs text-muted italic">No comments yet. Start the conversation!</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {comments.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {c.userDisplayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-dark dark:text-white">{c.userDisplayName}</p>
                          <span className="text-[10px] text-muted">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-sm text-muted mt-0.5">{c.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1 rounded hover:bg-danger/10 text-muted hover:text-danger transition-colors opacity-0 hover:opacity-100 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create/Edit Task Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle>
                <DialogDescription>
                  {editingTask ? "Update task details and assignee." : "Add a new task to a project."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-5 px-0.5">
              <FormSection title="Task Details" columns={2} gradient>
                <FormInput
                  label="Task Title"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Design homepage layout"
                  required
                />
                <FormSelect
                  label="Project"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  value={taskForm.projectId}
                  onChange={(e) => setTaskForm({ ...taskForm, projectId: e.target.value })}
                  options={projects?.map((p) => ({ value: p.id, label: p.name })) || []}
                  required
                />
                <FormSelect
                  label="Priority"
                  icon={<AlertCircle className="h-4 w-4" />}
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskData["priority"] })}
                  options={PRIORITY_OPTIONS}
                />
                <FormSelect
                  label="Status"
                  icon={<Clock className="h-4 w-4" />}
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskData["status"] })}
                  options={STATUS_OPTIONS}
                />
                <FormInput
                  label="Due Date"
                  icon={<CalendarDays className="h-4 w-4" />}
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
                <FormInput
                  label="Estimated Hours"
                  icon={<Clock className="h-4 w-4" />}
                  type="number"
                  value={String(taskForm.estimatedHours)}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                />
              </FormSection>
              <FormSection title="Description" columns={1}>
                <FormTextarea
                  label="Description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Describe the task requirements..."
                />
              </FormSection>
            </div>
            <FormActions
              onCancel={closeDialog}
              submitLabel={saving ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
              loading={saving}
              error={null}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
