"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  CalendarDays,
  Clock,
  FileText,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

interface ApprovalItem {
  id: string;
  _id?: string;
  employeeName: string;
  employeeCode?: string;
  type: "leave" | "regularization" | "overtime";
  fromDate?: string;
  toDate?: string;
  totalDays?: number;
  isHalfDay?: boolean;
  halfDaySlot?: "first_half" | "second_half";
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  details?: string;
}

export default function ManagerApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "leave" | "regularization" | "overtime">("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/leaves?status=pending");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : [];
        setApprovals(
          list.map((l: any) => ({
            id: l.id || l._id,
            employeeName: l.userName || l.userEmail || "Employee",
            employeeCode: l.employeeCode || "",
            type: "leave",
            fromDate: l.fromDate ? new Date(l.fromDate).toLocaleDateString() : "",
            toDate: l.toDate ? new Date(l.toDate).toLocaleDateString() : "",
            totalDays: l.totalDays || 1,
            isHalfDay: l.isHalfDay || false,
            halfDaySlot: l.halfDaySlot || null,
            reason: l.reason || "",
            status: l.status || "pending",
            submittedAt: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "Today",
          }))
        );
      }
    } catch {
      showToast("Error loading approvals", "error");
    }
    setLoading(false);
  };

  const filtered = filterType === "all" ? approvals : approvals.filter((a) => a.type === filterType);
  const pending = filtered.filter((a) => a.status === "pending");

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          id,
          approvedById: user?.id || "manager",
        }),
      });
      if (res.ok) {
        showToast("Request approved successfully!");
        setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a)));
      } else {
        const err = await res.json();
        showToast(err.error || "Approval failed", "error");
      }
    } catch {
      showToast("Network error approving request", "error");
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          id,
          approvedById: user?.id || "manager",
          reason: "Rejected by manager",
        }),
      });
      if (res.ok) {
        showToast("Request rejected.");
        setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a)));
      } else {
        const err = await res.json();
        showToast(err.error || "Rejection failed", "error");
      }
    } catch {
      showToast("Network error rejecting request", "error");
    }
    setProcessingId(null);
  };

  return (
    <AppShell title="Approval Center">
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

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Approval Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review and approve team leave &amp; attendance requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          {(["all", "leave", "regularization", "overtime"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={filterType === t ? "default" : "outline"}
              onClick={() => setFilterType(t)}
              className="text-xs font-bold capitalize"
            >
              {t === "all" ? "All" : t}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat icon={<CalendarDays className="h-5 w-5 text-orange-500" />} label="Leave Requests" value={approvals.filter((a) => a.type === "leave").length} />
        <MiniStat icon={<FileText className="h-5 w-5 text-blue-500" />} label="Regularization" value={approvals.filter((a) => a.type === "regularization").length} />
        <MiniStat icon={<Clock className="h-5 w-5 text-yellow-500" />} label="Overtime" value={approvals.filter((a) => a.type === "overtime").length} />
        <MiniStat icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Pending Actions" value={pending.length} />
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading approvals from MongoDB...
        </div>
      ) : pending.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-emerald-300 dark:border-emerald-500/20 rounded-2xl bg-white dark:bg-[#0B0F19]/60">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">All caught up!</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            There are no pending approvals requiring your action right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 shadow-sm text-xs"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{item.employeeName}</span>
                  {item.employeeCode && (
                    <span className="text-primary font-mono font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">
                      {item.employeeCode}
                    </span>
                  )}
                  <TypeBadge type={item.type} />
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {item.type === "leave" && `${item.totalDays} day(s)${item.isHalfDay ? ` (Half: ${item.halfDaySlot === "first_half" ? "1st Half" : "2nd Half"})` : ""} · ${item.fromDate} → ${item.toDate}`}
                  {item.type === "regularization" && `${item.fromDate || "N/A"} · Reason: ${item.reason}`}
                  {item.type === "overtime" && `${item.details || "Overtime hours"} · ${item.fromDate || "N/A"}`}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Reason: {item.reason}</p>
                <p className="text-[10px] text-slate-400 mt-1">Submitted: {item.submittedAt}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  disabled={processingId === item.id}
                  onClick={() => handleApprove(item.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 gap-1.5 shadow-sm"
                >
                  {processingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={processingId === item.id}
                  onClick={() => handleReject(item.id)}
                  className="text-xs font-bold h-9 px-4 gap-1.5 border-red-200 dark:border-red-500/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    leave: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    regularization: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    overtime: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${map[type] || map.leave}`}>
      {type.toUpperCase()}
    </span>
  );
}
