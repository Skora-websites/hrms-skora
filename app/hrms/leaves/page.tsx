"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  Loader2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface LeaveRequest {
  id: string;
  _id?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  userName?: string;
  userEmail?: string;
}

interface LeaveType {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  maxBalance: number;
}

export default function LeavesPage() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes] = await Promise.all([
        fetch("/api/hrm/v2/leaves"),
        fetch("/api/hrm/v2/leaves?type=types"),
      ]);

      if (typesRes.ok) {
        const tData = await typesRes.json();
        const typesList = Array.isArray(tData.data) ? tData.data : [];
        setLeaveTypes(typesList);
        if (typesList.length > 0 && !selectedLeaveTypeId) {
          setSelectedLeaveTypeId(typesList[0].id || typesList[0]._id || typesList[0].code);
        }
      }

      if (leavesRes.ok) {
        const lData = await leavesRes.json();
        setLeaves(Array.isArray(lData.data) ? lData.data : []);
      }
    } catch {
      showToast("Error loading leaves", "error");
    }
    setLoading(false);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) {
      showToast("Please complete all required fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          userId: "current",
          leaveTypeId: selectedLeaveTypeId || "casual",
          fromDate: startDate,
          toDate: endDate,
          reason: reason.trim(),
        }),
      });

      if (res.ok) {
        showToast("Leave application submitted to Manager & HR!");
        setShowApplyModal(false);
        setReason("");
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to submit leave application", "error");
      }
    } catch {
      showToast("Network error submitting application", "error");
    }
    setSubmitting(false);
  };

  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const pendingLeaves = leaves.filter((l) => l.status === "pending");

  return (
    <AppShell title="Leave Management & Time Off">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Application &amp; History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Submit time-off requests directly to your Reporting Manager &amp; HR Admin
          </p>
        </div>

        <Button
          onClick={() => setShowApplyModal(true)}
          className="bg-primary text-white hover:bg-primary/90 gap-2 font-bold shadow-md text-xs"
        >
          <Plus className="h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {/* Leave Balances Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Casual Leave (CL)</span>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">12 Days</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Annual quota</span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sick Leave (SL)</span>
          <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">12 Days</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Annual quota</span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Annual Leave (AL)</span>
          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">24 Days</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Annual quota</span>
        </div>
      </div>

      {/* Leave Requests Table / Feed */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> Submitted Leave Requests ({leaves.length})
        </h3>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading leave requests from MongoDB...
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs">
            No leave requests submitted yet. Click &quot;Apply for Leave&quot; above to submit your first request.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {leaves.map((l) => (
              <div
                key={l.id || l._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {l.leaveTypeName || l.leaveTypeId || "Leave"} ({l.totalDays || 1} Day{l.totalDays > 1 ? "s" : ""})
                    </span>
                    {l.userName && (
                      <span className="text-slate-500 text-[11px]">· {l.userName}</span>
                    )}
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                    Reason: {l.reason}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                    {l.fromDate ? new Date(l.fromDate).toLocaleDateString() : ""} → {l.toDate ? new Date(l.toDate).toLocaleDateString() : ""}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      l.status === "approved"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : l.status === "rejected"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                    }`}
                  >
                    {l.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                    {l.status === "rejected" && <XCircle className="h-3 w-3" />}
                    {l.status === "pending" && <Clock className="h-3 w-3" />}
                    {l.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ APPLY FOR LEAVE MODAL ═══ */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Apply for Time Off
            </h3>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
              <UserCheck className="h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>Submission:</strong> Sent directly to your <strong>Reporting Manager</strong> &amp; <strong>HR Admin</strong> for approval.
              </span>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Leave Policy / Type *
                </label>
                <select
                  value={selectedLeaveTypeId}
                  onChange={(e) => setSelectedLeaveTypeId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id || t._id || t.code} value={t.id || t._id || t.code}>
                      {t.name} (Max {t.maxBalance}d)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none [color-scheme:light_dark]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none [color-scheme:light_dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Reason for your time-off request..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowApplyModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-white font-bold gap-2 text-xs">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit to Manager &amp; HR
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
