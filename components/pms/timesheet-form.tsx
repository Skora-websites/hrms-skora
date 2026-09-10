"use client";

import { useState } from "react";
import { Task } from "@/lib/db/tasks";
import { Project } from "@/lib/db/projects";
import { Button } from "@/components/ui/button";
import { logTimesheetAction } from "@/lib/actions/pms-actions";
import { useAuth } from "@/components/providers/auth-provider";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TimesheetFormProps {
  tasks: Task[];
  projects: Project[];
  isPunchedIn?: boolean;
  onSuccess?: () => void;
}

export function TimesheetForm({ tasks, projects, isPunchedIn = true, onSuccess }: TimesheetFormProps) {
  const { user } = useAuth();

  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?._id || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState(4);
  const [billable, setBillable] = useState(true);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const selectedTask = tasks.find((t) => t._id === selectedTaskId);
  const selectedProject = projects.find((p) => p._id === selectedTask?.projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedTaskId) {
      setErrorMsg("Please select a task");
      return;
    }

    if (hours <= 0 || hours > 24) {
      setErrorMsg("Hours must be between 0.5 and 24");
      return;
    }

    setLoading(true);

    const res = await logTimesheetAction({
      taskId: selectedTaskId,
      taskTitle: selectedTask?.title || "Task",
      projectId: selectedTask?.projectId || selectedProject?._id || "",
      projectName: selectedTask?.projectName || selectedProject?.name || "Project",
      userId: user?.id || "employee",
      userName: user?.name || user?.email || "Employee",
      date,
      hours: Number(hours),
      billable,
      notes,
      isPunchedIn, // Attendance validation gate
    });

    setLoading(false);

    if (res.success) {
      setSuccessMsg(true);
      setNotes("");
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error || "Failed to log timesheet");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <h3 className="font-bold text-slate-900 dark:text-white text-lg">Log Timesheet Entry</h3>

      {/* Cross-module validation gate message */}
      {!isPunchedIn && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Attendance Gate Active:</strong> You are not currently Punched In. You must punch in via Attendance before submitting hours.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Timesheet entry submitted to Manager for approval!</span>
        </div>
      )}

      {/* Select Task */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Task</label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
        >
          <option value="" disabled>Select a task...</option>
          {tasks.map((task) => (
            <option key={task._id} value={task._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              {task.title} ({task.projectName || "PMS"})
            </option>
          ))}
        </select>
      </div>

      {/* Date & Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hours Logged</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Billable toggle */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="billable"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-primary focus:ring-primary"
        />
        <label htmlFor="billable" className="text-xs text-slate-700 dark:text-slate-300">
          Billable Time (Client Project Work)
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Description / Notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you accomplish during these hours?"
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || !isPunchedIn}
        className="w-full bg-primary text-white hover:bg-primary/90 font-bold shadow-md"
      >
        {loading ? "Submitting..." : "Submit Timesheet Entry"}
      </Button>
    </form>
  );
}
