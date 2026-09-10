"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CalendarDays,
  ClipboardList,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Users,
  TrendingUp,
  Play,
  MapPin,
  Briefcase,
  Send,
  Download,
  CheckCircle2 as CheckIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { OnboardingCountdown } from "@/components/hr/onboarding-countdown";
import { downloadFileFromUrl } from "@/lib/download";

// ── Types ──────────────────────────────────────────────────

interface OfferLetter {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  offerContent: string | null;
  createdAt: string;
  releasedAt: string | null;
  downloadedAt: string | null;
}

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

interface Task {
  _id: string;
  title: string;
  projectName?: string;
  status: string;
  priority?: string;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingOffer, setRequestingOffer] = useState(false);
  const [offerMsg, setOfferMsg] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [offerPassword, setOfferPassword] = useState<string | null>(null);

  // Document upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [onbRes, taskRes, payRes, leaveRes, offerRes] = await Promise.all([
        fetch(`/api/hrm/v2/onboarding?employeeTasks=true&userId=${user?.id || "me"}`),
        fetch(`/api/hrm/v2/tasks?assigneeId=${user?.id || ""}`),
        fetch("/api/hrm/v2/payroll/mypayslips"),
        fetch(`/api/hrm/v2/leaves?type=balances&userId=${user?.id || "me"}`),
        fetch("/api/hrm/v2/offer-letters"),
      ]);
      if (onbRes.ok) {
        const onbData = (await onbRes.json()).data;
        setOnboardingTasks(Array.isArray(onbData) ? onbData : []);
      }
      if (taskRes.ok) setTasks((await taskRes.json()).data || []);
      if (payRes.ok) setPayslips((await payRes.json()).data || []);
      if (leaveRes.ok) setLeaveBalances((await leaveRes.json()).data || []);
      if (offerRes.ok) setOfferLetters((await offerRes.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      await fetch("/api/hrm/v2/onboarding/upload", { method: "POST", body: formData });
      loadData();
    } catch { /* empty */ }
    setUploading(false);
    setUploadFile(null);
  };

  const handleRequestOffer = async () => {
    setRequestingOffer(true);
    setOfferMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/offer-letters", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setOfferMsg("Offer letter request submitted! The CEO will review and release it.");
        const or2 = await fetch("/api/hrm/v2/offer-letters").then(function(r) { return r.ok ? r.json() : { data: [] }; });
        setOfferLetters(Array.isArray(or2.data) ? or2.data : []);
      } else {
        setOfferMsg(data.error || "Failed to submit request");
      }
    } catch {
      setOfferMsg("Network error. Please try again.");
    }
    setRequestingOffer(false);
  };

  const latestOffer = offerLetters.length > 0 ? offerLetters[0] : null;

  const handleDownloadOffer = async () => {
    if (!latestOffer) return;
    try {
      const { ok, headers } = await downloadFileFromUrl(
        "/api/hrm/v2/offer-letters/download?id=" + latestOffer.id,
        "offer-letter-" + (latestOffer.employeeName || "employee").replace(/\s+/g, "-") + ".pdf"
      );
      if (ok) {
        const pw = headers.get("X-Offer-Letter-Password");
        if (pw) { setOfferPassword(pw); setShowPasswordModal(true); }
      }
    } catch { /* empty */ }
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
                  {latestTask?.reportingManager || "Not Assigned"}
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
        <QuickStat icon={<ClipboardList className="h-5 w-5 text-primary" />} label="My Tasks" value={tasks.length} />
        <QuickStat icon={<CalendarDays className="h-5 w-5 text-orange-500" />} label="Leave Balance" value={leaveBalances.reduce((s, b) => s + b.remaining, 0)} suffix="days" />
        <QuickStat icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Payslips" value={payslips.length} />
        <QuickStat icon={<TrendingUp className="h-5 w-5 text-blue-500" />} label="Performance" value="—" />
      </div>

      {/* ═══ My Tasks ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> My Tasks Board
          </h3>
          <a href="/hrms/employee/my-tasks" className="text-xs text-primary hover:underline font-semibold">
            Open Kanban →
          </a>
        </div>
        {tasks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No tasks assigned yet. Check back later.
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((t) => (
              <div key={t._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div className="flex items-center gap-3">
                  <TaskStatusDot status={t.status} />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">{t.title}</span>
                    <span className="block text-[10px] text-slate-500">{t.projectName || "PMS Project"}</span>
                  </div>
                </div>
                <a href="/hrms/employee/timesheet">
                  <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] gap-1 font-bold">
                    <Play className="h-3 w-3" /> Log Time
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/*     OFFER LETTER     */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" /> Offer Letter
          </h3>
        </div>
        {offerMsg && (
          <div className={"mb-4 p-3 rounded-xl text-xs font-semibold border " + (offerMsg.indexOf("submitted") >= 0 ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400")}>
            {offerMsg}
          </div>
        )}
        {!latestOffer ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">You have not requested an offer letter yet.</p>
            <button onClick={handleRequestOffer} disabled={requestingOffer}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors">
              <Send className="h-3.5 w-3.5" /> {requestingOffer ? "Submitting..." : "Generate Offer Letter"}
            </button>
          </div>
        ) : (
          <div className="mt-3 text-right">
            <button onClick={handleRequestOffer} disabled={requestingOffer}
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline disabled:opacity-50 transition-colors">
              <Send className="h-3 w-3" /> {requestingOffer ? "Submitting..." : latestOffer.status === "pending_ceo" ? "Remind CEO" : "Request Another"}
            </button>
          </div>
        )}
        {latestOffer && (
          <div className={"p-4 rounded-xl border " + (latestOffer.status === "released" ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20" : "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {latestOffer.status === "released" ? <CheckIcon className="h-5 w-5 text-emerald-500" /> : <Clock className="h-5 w-5 text-amber-500" />}
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Offer Letter</p>
                  <p className={"text-[10px] font-semibold " + (latestOffer.status === "released" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {latestOffer.status === "released" ? "Released by CEO — Ready to Download" : "Pending CEO Review"}
                  </p>
                  {latestOffer.salary && <p className="text-[10px] text-slate-500 mt-1">Annual Salary: ₹{latestOffer.salary.toLocaleString()}</p>}
                  {latestOffer.joiningDate && <p className="text-[10px] text-slate-500">Joining: {latestOffer.joiningDate}</p>}
                </div>
              </div>
              {latestOffer.status === "released" && (
                <button onClick={handleDownloadOffer} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Bottom Grid: Leave Balance + Recent Payslips ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Balances */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
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
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
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
      {/* OFFER LETTER PASSWORD MODAL */}
      {showPasswordModal && offerPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <FileText className="h-10 w-10 mx-auto text-blue-500 mb-3" />
              <h3 className="font-bold text-lg">Offer Letter Downloaded</h3>
              <p className="text-xs text-slate-500 mt-1">Use the password below to open the document</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-center">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Document Password</p>
              <p className="text-lg font-mono font-extrabold text-amber-700 dark:text-amber-300 tracking-wider">{offerPassword}</p>
            </div>
            <p className="text-[10px] text-slate-400 text-center">This password protects your offer letter. Do not share it.</p>
            <button onClick={() => setShowPasswordModal(false)} className="w-full bg-primary text-white py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors">Got it</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function QuickStat({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-extrabold">{value}{suffix && <span className="text-xs font-normal text-slate-500 ml-1">{suffix}</span>}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function TaskStatusDot({ status }: { status: string }) {
  const color = status === "DONE" || status === "COMPLETED"
    ? "bg-emerald-500"
    : status === "IN_PROGRESS"
    ? "bg-yellow-500"
    : "bg-slate-300 dark:bg-slate-600";
  return <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />;
}
