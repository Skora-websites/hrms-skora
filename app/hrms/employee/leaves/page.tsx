"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface LeaveRequest {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDaySlot: "first_half" | "second_half" | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
}

interface RegularizationRequest {
  id: string;
  date: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export default function EmployeeLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);

  // Leave form state
  const [leaveType, setLeaveType] = useState("casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState<"first_half" | "second_half">("first_half");
  const [reason, setReason] = useState("");

  // Regularization form state
  const [regDate, setRegDate] = useState("");
  const [regReason, setRegReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaveRes] = await Promise.allSettled([
        fetch("/api/hrm/v2/leaves").then(r => r.ok ? r.json() : null),
      ]);
      if (leaveRes.status === "fulfilled" && leaveRes.value) {
        const allLeaves = Array.isArray(leaveRes.value.data) ? leaveRes.value.data : [];
        setLeaves(allLeaves.map((l: any) => ({
          id: l.id || l._id || "",
          type: l.leaveTypeName || l.leaveType || l.type || "Leave",
          fromDate: l.fromDate ? new Date(l.fromDate).toLocaleDateString() : "",
          toDate: l.toDate ? new Date(l.toDate).toLocaleDateString() : "",
          totalDays: l.totalDays || 1,
          isHalfDay: l.isHalfDay || false,
          halfDaySlot: l.halfDaySlot || null,
          reason: l.reason || "",
          status: l.status || "pending",
        })));
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", userId: "current", leaveTypeId: leaveType, fromDate, toDate, reason: (reason || "") + (isHalfDay ? " (Half Day - " + (halfDaySlot === "first_half" ? "Morning" : "Afternoon") + ")" : "") }),
      });
      setShowApplyModal(false);
      resetLeaveForm();
      loadData();
    } catch { /* empty */ }
  };

  const handleApplyRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/hrm/v2/attendance/regularization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: regDate, reason: regReason }),
      });
      setShowRegModal(false);
      setRegDate("");
      setRegReason("");
      loadData();
    } catch { /* empty */ }
  };

  const resetLeaveForm = () => {
    setLeaveType("casual");
    setFromDate("");
    setToDate("");
    setIsHalfDay(false);
    setHalfDaySlot("first_half");
    setReason("");
  };

  const pending = leaves.filter((l) => l.status === "pending");
  const processed = leaves.filter((l) => l.status !== "pending");

  return (
    <AppShell title="Leave Requests">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Requests</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Apply for leaves &amp; regularization requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowRegModal(true)} variant="outline" className="text-xs font-bold gap-1 border-primary/30 text-primary">
            <FileText className="h-3.5 w-3.5" /> Regularization
          </Button>
          <Button onClick={() => setShowApplyModal(true)} className="bg-primary text-white font-bold text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Apply Leave
          </Button>
        </div>
      </div>

      {/* Pending */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" /> Pending ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs">
            No pending leave requests
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold">{l.type}</span>
                  <span className="text-slate-500 ml-2">
                    {l.fromDate} → {l.toDate}
                    {l.isHalfDay && ` (${l.halfDaySlot === "first_half" ? "1st Half" : "2nd Half"})`}
                    {" · "}{l.totalDays}d
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{l.reason}</span>
                </div>
                <StatusChip status={l.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regularizations */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" /> Regularization Requests ({regularizations.length})
        </h3>
        {regularizations.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs">
            No regularization requests submitted
          </div>
        ) : (
          <div className="space-y-2">
            {regularizations.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold">{r.date}</span>
                  <span className="block text-[10px] text-slate-400">{r.reason}</span>
                </div>
                <StatusChip status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Processed ({processed.length})
        </h3>
        {processed.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 text-xs">
            No processed leave requests yet
          </div>
        ) : (
          <div className="space-y-2">
            {processed.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold">{l.type}</span>
                  <span className="text-slate-500 ml-2">{l.fromDate} → {l.toDate} · {l.totalDays}d</span>
                </div>
                <StatusChip status={l.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Apply Leave Modal ═══ */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <CalendarDays className="h-5 w-5 text-primary" /> Apply for Leave
            </h3>
            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Leave Type</label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="annual">Annual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">From Date</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} required className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">To Date</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} required className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>

              {/* Half Day Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="font-semibold block">Half Day</span>
                  <span className="text-[10px] text-slate-500">Toggle for half-day leave</span>
                </div>
                <button type="button" onClick={() => setIsHalfDay(!isHalfDay)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isHalfDay ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHalfDay ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {isHalfDay && (
                <div className="flex gap-3">
                  <Button type="button" variant={halfDaySlot === "first_half" ? "default" : "outline"} onClick={() => setHalfDaySlot("first_half")} className="flex-1 text-xs font-bold">
                    First Half (10 AM – 2 PM)
                  </Button>
                  <Button type="button" variant={halfDaySlot === "second_half" ? "default" : "outline"} onClick={() => setHalfDaySlot("second_half")} className="flex-1 text-xs font-bold">
                    Second Half (2:30 PM – 7 PM)
                  </Button>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} required rows={3} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Reason for leave..." />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => { setShowApplyModal(false); resetLeaveForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white font-bold gap-1">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Regularization Modal ═══ */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-blue-500" /> Attendance Regularization
            </h3>
            <form onSubmit={handleApplyRegularization} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} required className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason</label>
                <textarea value={regReason} onChange={(e) => setRegReason(e.target.value)} required rows={3} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Reason for regularization (late arrival, missed punch, etc.)..." />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowRegModal(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white font-bold gap-1">Submit</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${map[status] || map.pending}`}>
      {status.toUpperCase()}
    </span>
  );
}
