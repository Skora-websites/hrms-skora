"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { KanbanBoard } from "@/components/pms/kanban-board";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, CheckCircle2 } from "lucide-react";
import { createTaskAction } from "@/lib/actions/pms-actions";
import { useAuth } from "@/components/providers/auth-provider";
import { Task, TaskPriority } from "@/lib/db/tasks";

export default function EmployeeMyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [estimatedHours, setEstimatedHours] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v2/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    const res = await createTaskAction({
      projectId: "my-personal-tasks",
      projectName: "Personal Tasks",
      title,
      description,
      priority,
      assigneeId: user?.id || "employee",
      assigneeName: user?.name || user?.email || "Employee",
      estimatedHours: Number(estimatedHours),
    });

    setSubmitting(false);

    if (res.success && res.task) {
      setTasks((prev) => [res.task as Task, ...prev]);
      setShowModal(false);
      setTitle("");
      setDescription("");
    }
  };

  return (
    <AppShell title="My Personal Task Board">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Tasks & Kanban Board</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize personal work, drag & drop tasks to update progress, and log time
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-primary text-white hover:bg-primary/90 gap-2 font-bold shadow-md">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading tasks...</div>
      ) : (
        <KanbanBoard initialTasks={tasks} onAddTask={() => setShowModal(true)} />
      )}

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Create New Task
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user dashboard UI"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief details about what needs to be done..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                  >
                    <option value="LOW" className="bg-white dark:bg-slate-900">Low</option>
                    <option value="MEDIUM" className="bg-white dark:bg-slate-900">Medium</option>
                    <option value="HIGH" className="bg-white dark:bg-slate-900">High</option>
                    <option value="URGENT" className="bg-white dark:bg-slate-900">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Est. Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-white font-bold">
                  {submitting ? "Creating..." : "Save Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
