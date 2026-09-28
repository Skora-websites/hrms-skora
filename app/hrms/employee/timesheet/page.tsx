"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

interface TimesheetEntry {
  id: string;
  taskTitle: string;
  projectName: string;
  date: string;
  hours: number;
  billable: boolean;
  status: string;
  notes?: string;
}

export default function EmployeeTimesheetPage() {
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Log-hours form state
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("8");
  const [taskTitle, setTaskTitle] = useState("");
  const [billable, setBillable] = useState(true);
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/timesheets");
      if (res.ok) {
        const data = await res.json();
        setTimesheets(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numHours = Number(hours);
    if (!date || !numHours || numHours <= 0) {
      setMsg("Please provide a valid date and hours.");
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          hours: numHours,
          taskTitle: taskTitle || "General work",
          billable,
          notes,
        }),
      });
      if (res.ok) {
        setMsg("Timesheet entry submitted for manager approval.");
        setTaskTitle("");
        setNotes("");
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg(err.error || "Could not submit timesheet entry.");
      }
    } catch {
      setMsg("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <AppShell title="My Timesheet & Work Hours">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Timesheet & Hours Log</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Log your work hours and track Manager approval statuses
        </p>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Log Timesheet Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4"
          >
            <h3 className="font-bold text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Log Hours
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hours</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Work description</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="What did you work on?"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="rounded"
              />
              Billable hours
            </label>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white font-bold text-xs gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {submitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </form>
        </div>

        {/* Right 2 Cols: Timesheet Log History */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Submitted Timesheet History
            </h3>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading entries...
              </div>
            ) : timesheets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No timesheet entries logged yet. Use the form on the left to submit your hours.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold">Work</th>
                      <th className="pb-3 font-semibold">Hours</th>
                      <th className="pb-3 font-semibold">Billable</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                    {timesheets.map((ts) => (
                      <tr key={ts.id}>
                        <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">{ts.date}</td>
                        <td className="py-3 font-semibold text-slate-900 dark:text-white">{ts.taskTitle || "Task Work"}</td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">{ts.hours}h</td>
                        <td className="py-3">
                          {ts.billable ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="py-3">
                          {ts.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Approved
                            </span>
                          ) : ts.status === "REJECTED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 font-bold border border-red-500/20">
                              <AlertCircle className="h-3 w-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-600 dark:text-yellow-400 font-bold border border-yellow-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
