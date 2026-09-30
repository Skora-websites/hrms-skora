"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays,
  ClipboardList,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Upload,
  Users,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { OnboardingCountdown } from "@/components/hr/onboarding-countdown";

// ── Types ──────────────────────────────────────────────────

interface OnboardingTask {
  id: string;
  userId: string;
  title?: string;
  status: string;
  submittedAt?: string;
  employeeName?: string;
  department?: string;
  documentName?: string;
  documentUrl?: string;
  lastRejectionDate?: string;
  deadlineHoursRemaining?: number;
  employeeCode?: string;
  reportingManager?: string;
}

interface Payslip {
  _id: string;
  month: string;
  year: number;
  netPay: number;
  status: string;
}

interface LeaveBalance {
  type: string;
  total: number;
  used: number;
  remaining: number;
}

// ── Main Component ─────────────────────────────────────────

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingTask[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  // Shared status message for employee-initiated actions (document upload).
  const [offerMsg, setOfferMsg] = useState<string | null>(null);

  // Document upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [onbRes, payRes, leaveRes] = await Promise.all([
        fetch(`/api/hrm/v2/onboarding?employeeTasks=true&userId=${user?.id || "me"}`),
        fetch("/api/hrm/v2/payroll/mypayslips"),
        fetch(`/api/hrm/v2/leaves?type=balances&userId=${user?.id || "me"}`),
      ]);
      if (onbRes.ok) {
        const onbData = (await onbRes.json()).data;
        setOnboardingTasks(Array.isArray(onbData) ? onbData : []);
      }
      if (payRes.ok) setPayslips((await payRes.json()).data || []);
      if (leaveRes.ok) setLeaveBalances((await leaveRes.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Re-run once the auth provider resolves: the first mount often fires
    // before user?.id exists, which made balances/payslips fetch with
    // userId="me" and 403 into empty states.
  }, [user?.id]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setOfferMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/hrm/v2/onboarding/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      setOfferMsg("Document uploaded and submitted to HR for verification.");
      loadData();
    } catch (e: any) {
      setOfferMsg(e?.message || "Upload failed. Please try again.");
    }
    setUploading(false);
    setUploadFile(null);
  };

  const latestTask = onboardingTasks.length > 0 ? onboardingTasks[0] : null;
  // Onboarding status comes primarily from the user record — registration does
  // not create onboarding task rows for every account, so deriving state from
  // tasks alone left long-approved users stuck on "Documents Under Review".
  const userVerified =
    Boolean(user?.employeeCode) ||
    (user?.status && user.status !== "pending_verification" && user?.onboardingStatus !== "pending") ||
    latestTask?.status === "completed" ||
    latestTask?.status === "APPROVED";
  const userRejected =
    (user?.onboardingStatus || "").toLowerCase().includes("reject") ||
    latestTask?.status === "rejected" ||
    latestTask?.status === "REJECTED_48H_DEADLINE";
  const isVerified = userVerified && !userRejected;
  const isRejected = userRejected;
  const isPending = !isVerified && !isRejected;

  return (
    <AppShell title="Employee Hub">
      {/* ═══ Top Banner — Dynamic Onboarding Status ═══ */}
      {isRejected && latestTask && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-5 mb-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">
                  Documents Rejected — Re-upload Required
                </h3>
                <p className="text-red-600 dark:text-red-300 mt-1">
                  Your documents were rejected. Please re-upload within the deadline.
                </p>
                {latestTask?.lastRejectionDate && (
                  <div className="mt-2">
                    <OnboardingCountdown
                      rejectionDate={latestTask.lastRejectionDate}
                      deadlineHours={48}
                      onExpired={() => {
                        // Escalate to super admin
                        fetch("/api/hrm/v2/onboarding/escalate", { method: "POST" });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="doc-upload"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="doc-upload">
                <Button asChild className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1 cursor-pointer">
                  <span><Upload className="h-3.5 w-3.5" /> Upload Document</span>
                </Button>
              </label>
              {uploadFile && (
                <Button onClick={handleUpload} disabled={uploading} className="bg-primary text-white font-bold text-xs gap-1">
                  {uploading ? "Uploading..." : "Submit"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {isVerified && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-5 mb-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">EMPLOYEE CODE</span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                  {user?.employeeCode || latestTask?.employeeCode || "Pending assignment"}
                </span>
              </div>
              <div className="w-px h-8 bg-emerald-200 dark:bg-emerald-500/20" />
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">DEPARTMENT</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {user?.department || latestTask?.department || "Not Assigned"}
                </span>
              </div>
              <div className="w-px h-8 bg-emerald-200 dark:bg-emerald-500/20" />
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">REPORTING MANAGER</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {/* The user record is authoritative (CEO-assigned); the
                      onboarding task row is a legacy fallback. */}
                  {(user as any)?.reportingManager || latestTask?.reportingManager || "Not Assigned"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="rounded-2xl border border-yellow-200 dark:border-yellow-500/20 bg-yellow-50 dark:bg-yellow-500/5 p-5 mb-6 text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
            <div>
              <h3 className="font-bold text-yellow-700 dark:text-yellow-400 text-sm">Documents Under Review</h3>
              <p className="text-yellow-600 dark:text-yellow-300 mt-1">
                Your documents are being reviewed by HR. You will receive your Employee Code once verified.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Action Hub — Punch In/Out ═══ */}
      <div className="mb-6">
        <AttendancePunchCard />
      </div>

      {/* ═══ Quick Stats ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <QuickStat icon={<CalendarDays className="h-5 w-5 text-orange-500" />} label="Leave Balance" value={leaveBalances.reduce((s, b) => s + b.remaining, 0)} suffix="days" />
        <QuickStat icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Payslips" value={payslips.length} />
        <QuickStat icon={<TrendingUp className="h-5 w-5 text-blue-500" />} label="Performance" value="—" />
      </div>

      {/* My Tasks board removed from the hub — tasks remain available on
          /hrms/employee/my-tasks and the manager dashboards. */}

      {/* Offer-letter UI removed — new joiners receive only the welcome
          email with credentials at onboarding approval. */}

      {/* ═══ Bottom Grid: Leave Balance + Recent Payslips ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balances */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" /> Leave Balances
            </h3>
            <a href="/hrms/employee/leaves" className="text-xs text-primary hover:underline font-semibold">
              Apply →
            </a>
          </div>
          {leaveBalances.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
              No leave data available.
            </div>
          ) : (
            <div className="space-y-3">
              {leaveBalances.map((b) => (
                <div key={b.type} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{b.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-500">{b.used}/{b.total}</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{b.remaining} left</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payslips */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" /> Recent Payslips
            </h3>
            <a href="/hrms/employee/payslips" className="text-xs text-primary hover:underline font-semibold">
              View All →
            </a>
          </div>
          {payslips.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
              No payslips generated yet.
            </div>
          ) : (
            <div className="space-y-2">
              {payslips.slice(0, 4).map((p) => (
                <div key={p._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{p.month} {p.year}</span>
                    <span className="block text-[10px] text-slate-500">Net Pay</span>
                  </div>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">₹{p.netPay.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function QuickStat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-extrabold">{value}{suffix && <span className="text-xs font-normal text-slate-500 ml-1">{suffix}</span>}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
