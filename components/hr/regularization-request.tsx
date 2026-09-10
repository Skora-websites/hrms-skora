"use client";

import { useState } from "react";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegularizationRequestProps {
  onSubmit?: (date: string, reason: string) => Promise<void>;
}

export function RegularizationRequest({ onSubmit }: RegularizationRequestProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(date, reason);
      } else {
        await fetch("/api/hrm/v2/attendance/regularization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, reason }),
        });
      }
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setDate("");
      setReason("");
    } catch { /* empty */ }
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <h3 className="font-bold text-base flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-500" /> Attendance Regularization
      </h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
        Submit a regularization request for late arrivals, missed punches, or clock-in errors.
        This will be routed to your Manager for approval.
      </p>

      {submitted && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Regularization request submitted successfully! Awaiting Manager approval.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Date of Irregular Attendance
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason for Regularization
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="e.g., Late arrival due to traffic, missed punch out, system error..."
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 text-[10px] text-blue-600 dark:text-blue-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Regularization requests are reviewed by your Manager. If rejected, you can re-submit with additional details.
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="bg-primary text-white font-bold gap-1"
        >
          {loading ? "Submitting..." : "Submit Regularization Request"}
        </Button>
      </form>
    </div>
  );
}
