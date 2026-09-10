"use client";

import { useState, useEffect, useRef } from "react";
import { Task } from "@/lib/db/tasks";
import { Play, Pause, Square, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logTimesheetAction } from "@/lib/actions/pms-actions";
import { useAuth } from "@/components/providers/auth-provider";

interface TaskTimerProps {
  task: Task;
  isPunchedIn?: boolean;
  onClose?: () => void;
}

export function TaskTimer({ task, isPunchedIn = true, onClose }: TaskTimerProps) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopAndLog = async () => {
    setIsRunning(false);

    if (seconds < 60) {
      setErrorMsg("Timer must run for at least 1 minute to log time.");
      return;
    }

    const hoursLogged = Number((seconds / 3600).toFixed(2));
    const todayStr = new Date().toISOString().split("T")[0];

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await logTimesheetAction({
      taskId: task._id || "",
      taskTitle: task.title,
      projectId: task.projectId,
      projectName: task.projectName || "Project",
      userId: user?.id || "anonymous",
      userName: user?.name || user?.email || "Employee",
      date: todayStr,
      hours: hoursLogged,
      billable: true,
      notes: `Logged via live Task Timer: ${formatTimer(seconds)}`,
      isPunchedIn, // Attendance validation gate check
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMsg(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || "Failed to log timesheet");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-primary/30 bg-white dark:bg-[#0B0F19]/95 p-6 backdrop-blur-xl shadow-2xl max-w-md w-full text-slate-900 dark:text-white">
      {/* Task info header */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-white/10">
        <div>
          <span className="text-xs text-primary font-bold">{task.projectName || "PMS Project"}</span>
          <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">{task.title}</h3>
        </div>
        <Clock className="h-5 w-5 text-primary animate-pulse" />
      </div>

      {/* Cross-Module Attendance Validation Banner */}
      {!isPunchedIn && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Attendance Gate Active:</strong> You are not currently Punched In. Please punch in via Attendance before logging work hours.
          </span>
        </div>
      )}

      {/* Digital Stopwatch Display */}
      <div className="flex flex-col items-center justify-center my-6 py-6 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/5">
        <span className="font-mono text-4xl font-extrabold tracking-wider text-slate-900 dark:text-white">
          {formatTimer(seconds)}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          {seconds > 0 ? `${(seconds / 3600).toFixed(2)} billable hours` : "Ready to track"}
        </span>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 mb-4">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 mb-4 font-bold">
          ✓ Timesheet entry logged & submitted for Manager approval!
        </div>
      )}

      {/* Control Actions */}
      <div className="flex items-center justify-center gap-3">
        {!isRunning ? (
          <Button
            type="button"
            disabled={!isPunchedIn || isSubmitting}
            onClick={() => setIsRunning(true)}
            className="gap-2 bg-primary text-white hover:bg-primary/90 min-w-[120px] font-bold"
          >
            <Play className="h-4 w-4" /> Start
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setIsRunning(false)}
            variant="outline"
            className="gap-2 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 min-w-[120px] font-bold"
          >
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}

        <Button
          type="button"
          disabled={seconds === 0 || isSubmitting}
          onClick={handleStopAndLog}
          variant="danger"
          className="gap-2 min-w-[120px] font-bold"
        >
          <Square className="h-4 w-4" /> Stop & Log
        </Button>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mt-4 underline"
        >
          Cancel / Close
        </button>
      )}
    </div>
  );
}
