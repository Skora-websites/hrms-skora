"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Users,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  projectName: string;
  taskTitle: string;
  date: string;
  hours: number;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "LOCKED";
}

export default function ManagerTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadTimesheets();
  }, [selectedDate]);

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrm/v2/timesheets?date=${selectedDate}`);
      if (res.ok) setTimesheets((await res.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const pending = timesheets.filter((t) => t.status === "PENDING");
  const approved = timesheets.filter((t) => t.status === "APPROVED");
  const locked = timesheets.filter((t) => t.status === "LOCKED");

  const handleApprove = (id: string) => {
    setTimesheets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "APPROVED" as const } : t))
    );
  };

  const handleReject = (id: string) => {
    setTimesheets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "REJECTED" as const } : t))
    );
  };

  const handleLockAll = () => {
    setTimesheets((prev) =>
      prev.map((t) => (t.status === "APPROVED" ? { ...t, status: "LOCKED" as const } : t))
    );
  };

  return (
    <AppShell title="Timesheet Review">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Timesheet Review</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review, approve &amp; lock team timesheet entries for payroll
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
          {approved.length > 0 && (
            <Button onClick={handleLockAll} className="bg-primary text-white font-bold text-xs gap-1">
              <Lock className="h-3.5 w-3.5" /> Lock All Approved ({approved.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 text-center text-slate-900 dark:text-white">
          <p className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{pending.length}</p>
          <p className="text-[11px] text-slate-500">Pending Review</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 text-center text-slate-900 dark:text-white">
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{approved.length}</p>
          <p className="text-[11px] text-slate-500">Approved</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 text-center text-slate-900 dark:text-white">
          <p className="text-2xl font-extrabold text-primary">{locked.length}</p>
          <p className="text-[11px] text-slate-500">Locked (Payroll Ready)</p>
        </div>
      </div>

      {/* Pending Timesheets */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" /> Pending Review ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            ✓ All timesheets reviewed for this date!
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-slate-50 dark:bg-black/30 text-xs"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{t.userName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-primary font-medium">{t.projectName}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">{t.taskTitle}</p>
                  {t.notes && <p className="text-slate-400 text-[10px] mt-1 italic">&quot;{t.notes}&quot;</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">{t.hours}h</span>
                    <span className="block text-[10px] text-slate-500">{t.date}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(t.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[10px] font-bold"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(t.id)}
                    className="gap-1 text-[10px] font-bold"
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved → Locked */}
      {approved.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-500" /> Approved & Ready to Lock ({approved.length})
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Locking these entries will route them to HR for final payroll processing.
          </p>
          <div className="space-y-2">
            {approved.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 text-xs">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {t.userName} — {t.taskTitle}
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
