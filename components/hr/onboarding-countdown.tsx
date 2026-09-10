"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock } from "lucide-react";

interface OnboardingCountdownProps {
  rejectionDate: string; // ISO date string
  deadlineHours: number; // Total hours allowed (usually 48)
  onExpired?: () => void;
}

export function OnboardingCountdown({
  rejectionDate,
  deadlineHours = 48,
  onExpired,
}: OnboardingCountdownProps) {
  const [remaining, setRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const deadline = new Date(rejectionDate).getTime() + deadlineHours * 60 * 60 * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setRemaining({ hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpired?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRemaining({ hours, minutes, seconds, expired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rejectionDate, deadlineHours, onExpired]);

  const isUrgent = remaining.hours < 12 && !remaining.expired;

  if (remaining.expired) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-bold">Deadline expired — Escalated to Super Admin</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
      isUrgent
        ? "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
        : "bg-yellow-50 dark:bg-yellow-500/5 border-yellow-200 dark:border-yellow-500/20"
    }`}>
      <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? "text-red-500 animate-pulse" : "text-yellow-500"}`} />
      <div>
        <span className={`font-bold ${isUrgent ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`}>
          Time Remaining:
        </span>
        <div className="flex items-center gap-1 mt-1 font-mono font-extrabold text-sm">
          <span className={`px-2 py-0.5 rounded ${isUrgent ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"}`}>
            {remaining.hours.toString().padStart(2, "0")}
          </span>
          <span className="text-slate-400">:</span>
          <span className={`px-2 py-0.5 rounded ${isUrgent ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"}`}>
            {remaining.minutes.toString().padStart(2, "0")}
          </span>
          <span className="text-slate-400">:</span>
          <span className={`px-2 py-0.5 rounded ${isUrgent ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" : "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300"}`}>
            {remaining.seconds.toString().padStart(2, "0")}
          </span>
        </div>
        {isUrgent && (
          <span className="text-[10px] text-red-500 dark:text-red-400 mt-1 block font-semibold">
            ⚠ Less than 12 hours remaining — upload immediately!
          </span>
        )}
      </div>
    </div>
  );
}
