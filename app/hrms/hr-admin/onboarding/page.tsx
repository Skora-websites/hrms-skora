"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { UserCheck, FileText, CheckCircle2, Clock, ShieldCheck, XCircle, AlertTriangle, MailPlus, RefreshCw, ChevronDown, ChevronRight, Eye, Loader2, User, Briefcase, Users, Landmark, History, MailX, MailCheck, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface OnboardingDetails {
  // Personal
  employeeName?: string;
  gender?: string;
  designation?: string;
  dateOfJoining?: string;
  department?: string;
  dateOfBirth?: string;
  // Employment
  uanNo?: string;
  joiningLocation?: string;
  panNo?: string;
  mobileNo?: string;
  aadharNo?: string;
  presentAddress?: string;
  permanentAddress?: string;
  annualCtc?: string;
  maritalStatus?: string;
  spouseName?: string;
  hasPf?: string;
  previousPfNumber?: string;
  epfSalary?: string;
  previousEsiNo?: string;
  esicDispensary?: string;
  // Nominee
  nomineeName?: string;
  nomineeDob?: string;
  nomineeAadhar?: string;
  nomineeRelation?: string;
  fatherName?: string;
  husbandName?: string;
  // Bank
  nameInBank?: string;
  bankAccountNumber?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  documentName: string;
  documentUrl?: string;
  status: "invite_requested" | "pending" | "approved" | "rejected_48h";
  employeeCode?: string;
  submittedAt: string;
  deadlineHoursRemaining?: number;
  inviteEmailed?: boolean;
  onboardingDetails?: OnboardingDetails;
  revealTokens?: Record<string, string>;
}

interface DeliveryEntry {
  _id?: string;
  id?: string;
  kind: string;
  to: string;
  status: "sent" | "failed";
  subject: string;
  provider: string;
  hasAttachment?: boolean;
  error?: string;
  createdAt: string;
}

const KIND_LABELS: Record<string, string> = {
  welcome_email: "Welcome email",
  offer_letter: "Offer letter",
  payslip: "Payslip",
  password_reset: "Password reset",
  experience_letter: "Experience letter",
  other: "Other",
};

const SENSITIVE_FIELDS = ["aadharNo", "nomineeAadhar", "panNo", "bankAccountNumber"] as const;

export default function HrAdminOnboardingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueSearch, setQueueSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealing, setRevealing] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [deliveries, setDeliveries] = useState<DeliveryEntry[]>([]);
  const [showDeliveries, setShowDeliveries] = useState(false);
  const knownIdsRef = useRef<Set<string> | null>(null);
  const revealedRef = useRef<Map<string, Record<string, string>>>(new Map());
  const newFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter the live queue by name/email/role/dept/employee code.
  const filteredCandidates = useMemo(() => {
    if (!queueSearch) return candidates;
    const q = queueSearch.toLowerCase();
    return candidates.filter((c) =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.role?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      (c.employeeCode || "").toLowerCase().includes(q)
    );
  }, [candidates, queueSearch]);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/onboarding?pending=true");
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data.data) ? data.data : [];
        // Polling re-fetches masked PII; re-apply any plaintext HR has
        // revealed this session so a background refresh doesn't re-mask it.
        const rows = raw.map((t: any) => {
          const id = t.id || t._id || "";
          const overrides = revealedRef.current.get(id);
          return overrides ? { ...t, onboardingDetails: { ...(t.onboardingDetails || {}), ...overrides } } : t;
        });
        setCandidates(rows.map((t: any) => ({
          id: t.id || t._id || "",
          name: t.employeeName || t.name || "",
          email: t.email || "",
          role: t.role || (t.status === "invite_requested" ? "Account Request" : "Employee"),
          department: t.department || "—",
          documentName: t.documentName || "",
          documentUrl: t.documentUrl || "",
          status: (t.status === "rejected" || t.status === "escalated" ? "rejected_48h"
            : t.status === "approved" ? "approved"
            : t.status === "invite_requested" ? "invite_requested"
            : "pending") as Candidate["status"],
          employeeCode: t.employeeCode,
          submittedAt: t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : (t.requestedAt ? new Date(t.requestedAt).toLocaleDateString() : "—"),
          deadlineHoursRemaining: t.rejectionDeadline
            ? Math.max(0, Math.round((new Date(t.rejectionDeadline).getTime() - Date.now()) / 3600000))
            : undefined,
          inviteEmailed: t.inviteEmailed === true,
          onboardingDetails: t.onboardingDetails || undefined,
          revealTokens: t.revealTokens || undefined,
        })));
        // Highlight rows that appeared since the last fetch and timestamp it.
        const ids = new Set<string>(rows.map((t: any) => String(t.id || t._id || "")));
        if (knownIdsRef.current) {
          const fresh = [...ids].filter((id) => !knownIdsRef.current!.has(id));
          if (fresh.length > 0) {
            setNewIds(new Set(fresh));
            if (newFlashTimer.current) clearTimeout(newFlashTimer.current);
            newFlashTimer.current = setTimeout(() => setNewIds(new Set()), 8000);
          }
        }
        knownIdsRef.current = ids;
        setLastUpdated(new Date());
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  // Live queue: poll every 15s while the tab is visible, and refresh
  // immediately when the tab becomes visible again (no wasted calls while
  // hidden, fresh data the moment HR looks back).
  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (document.visibilityState === "visible") loadCandidates();
    };
    const interval = setInterval(tick, 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadCandidates();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  const loadDeliveries = async () => {
    try {
      const res = await fetch("/api/hrm/v2/email/delivery-log?limit=60");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(Array.isArray(data.data) ? data.data : []);
      }
    } catch { /* empty */ }
  };

  const toggleDeliveries = () => {
    setShowDeliveries((v) => {
      if (!v) loadDeliveries();
      return !v;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const revealField = async (candidate: Candidate, field: string) => {
    const token = candidate.revealTokens?.[field];
    if (!token) return;
    setRevealing(`${candidate.id}:${field}`);
    try {
      const res = await fetch("/api/hrm/v2/onboarding/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: candidate.id, field, token }),
      });
      if (res.ok) {
        const data = await res.json();
        const value = data.data?.value;
        if (value) {
          const overrides = revealedRef.current.get(candidate.id) || {};
          overrides[field] = value;
          revealedRef.current.set(candidate.id, overrides);
        }
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id && c.onboardingDetails
              ? { ...c, onboardingDetails: { ...c.onboardingDetails, [field]: value } }
              : c
          )
        );
      } else {
        console.error("Reveal failed:", (await res.json().catch(() => ({}))).error);
      }
    } catch (err) {
      console.error("Failed to reveal field:", err);
    }
    setRevealing(null);
  };

  const handleApprove = async (id: string) => {
    try {
      // Server creates the account (when needed), issues the employee code,
      // emails the temporary password, and persists everything.
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: id, status: "approved" }),
      });
      if (res.ok) {
        const data = await res.json();
        const code = data.data?.employeeCode;
        const emailed = data.data?.inviteEmailed && data.data?.emailSent !== false;
        setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, status: "approved" as const, employeeCode: code, inviteEmailed: emailed } : c));
        if (emailed === false) {
          console.error("Approve succeeded but the welcome email failed to send.");
        }
        return;
      }
      console.error("Approve failed:", (await res.json().catch(() => ({}))).error);
    } catch (err) {
      console.error("Failed to approve onboarding:", err);
    }
  };

  const [resending, setResending] = useState<string | null>(null);

  const handleResendWelcome = async (c: Candidate): Promise<string> => {
    setResending(c.id);
    try {
      // Issues a FRESH temporary password, re-fences the account (password
      // change forced at next login), kills stale sessions, and re-sends the
      // welcome email. When SMTP fails, the server surfaces the password for
      // manual handover.
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: c.email, action: "resend-welcome" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.data?.emailSent === true) {
          setCandidates((prev) => prev.map((x) => x.id === c.id ? { ...x, inviteEmailed: true } : x));
          return `Fresh welcome email sent to ${c.email}.`;
        }
        if (data.data?.tempPassword) {
          return `Email failed. Temporary password (hand over manually): ${data.data.tempPassword}`;
        }
        return data.data?.message || "Done.";
      }
      return data.error || `Failed (HTTP ${res.status}).`;
    } catch (err: any) {
      console.error("Failed to resend welcome email:", err);
      return err?.message || "Network error — please retry.";
    } finally {
      setResending(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: id, status: "rejected" }),
      });
    } catch (err) {
      console.error("Failed to reject onboarding:", err);
    }
    setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, status: "rejected_48h" as const, deadlineHoursRemaining: 48 } : c));
  };

  return (
    <AppShell title="Onboarding & Document Verification">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding &amp; Account Requests</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review the full onboarding form, approve to email a temporary password, verify documents, or trigger 48-hour resubmission deadlines
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleDeliveries}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-primary/40"
          >
            <History className="h-3.5 w-3.5 text-primary" />
            Email delivery history
            {deliveries.some((x) => x.status === "failed") && (
              <span className="inline-flex items-center rounded-full bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                <MailX className="h-2.5 w-2.5 mr-0.5" /> failures
              </span>
            )}
          </button>
        </div>
        {showDeliveries && (
          <div className="mt-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-primary" /> Recent outbound emails
              </h3>
              <Button size="sm" variant="outline" onClick={loadDeliveries} className="h-7 px-2 text-[10px] font-bold">
                <RefreshCw className="h-3 w-3 mr-0.5" /> Refresh
              </Button>
            </div>
            {deliveries.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3 text-center">No emails sent yet. Approving an invite sends a welcome email; it will appear here.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                {deliveries.map((x) => (
                  <div key={x.id || x._id} className="py-2 flex items-start gap-2 text-[11px]">
                    {x.status === "sent" ? (
                      <MailCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <MailX className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <span className={`font-bold ${x.status === "sent" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {KIND_LABELS[x.kind] || x.kind}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400"> → {x.to}</span>
                      {x.hasAttachment && <span className="text-slate-400"> (PDF attached)</span>}
                      {x.status === "failed" && x.error && (
                        <span className="block text-[10px] text-red-500/90 truncate" title={x.error}>{x.error}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(x.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Requests &amp; Applications
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
            {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-bold transition ${live ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-slate-300 dark:border-white/10 text-slate-500"}`}
              title={live ? "Live sync on — new requests appear automatically every 15s" : "Live sync paused — use Refresh"}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {live ? "Live" : "Paused"}
            </button>
            <Button size="sm" variant="outline" onClick={loadCandidates} disabled={loading} className="h-7 px-2 text-[10px] font-bold">
              <RefreshCw className={`h-3 w-3 mr-0.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {loading && candidates.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading requests...</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No pending account requests or applications.
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search queue by name, email, role, department, or employee code..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No requests match your search.
              </div>
            ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold w-8"></th>
                  <th className="pb-3 font-semibold">Candidate</th>
                  <th className="pb-3 font-semibold">Role / Dept</th>
                  <th className="pb-3 font-semibold">Document</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Employee Code</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredCandidates.map((c) => (
                  <FragmentRow
                    key={c.id}
                    candidate={c}
                    isNew={newIds.has(c.id)}
                    expanded={expanded.has(c.id)}
                    onToggle={() => toggleExpanded(c.id)}
                    revealing={revealing}
                    onReveal={revealField}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onResend={handleResendWelcome}
                    resending={resending === c.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function FragmentRow({
  candidate: c,
  isNew,
  expanded,
  onToggle,
  revealing,
  onReveal,
  onApprove,
  onReject,
  onResend,
  resending,
}: {
  candidate: Candidate;
  isNew: boolean;
  expanded: boolean;
  onToggle: () => void;
  revealing: string | null;
  onReveal: (c: Candidate, field: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onResend: (c: Candidate) => Promise<string>;
  resending: boolean;
}) {
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const doResend = async () => {
    const msg = await onResend(c);
    setResendMsg(msg);
    setTimeout(() => setResendMsg(null), 12000);
  };
  const d = c.onboardingDetails;
  const hasDetails = d && Object.values(d).some((v) => typeof v === "string" && v);

  return (
    <>
      <tr className={`${expanded ? "bg-primary/[0.03]" : ""} ${isNew ? "bg-primary/[0.07] ring-1 ring-inset ring-primary/30" : ""}`}>
        <td className="py-3">
          {hasDetails ? (
            <button type="button" onClick={onToggle} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5" aria-label={expanded ? "Collapse details" : "Expand details"}>
              {expanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>
          ) : null}
        </td>
        <td className="py-3 font-bold">{c.name}<span className="block text-[10px] text-slate-500 font-normal">{c.email}</span></td>
        <td className="py-3"><span className="font-semibold">{c.role}</span><span className="block text-[10px] text-slate-500">{c.department}</span></td>
        <td className="py-3">
          {c.documentUrl ? (
            <a href={c.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-mono text-[11px] underline hover:text-primary/80">
              <FileText className="h-3 w-3 inline mr-1" />{c.documentName || "View"}
            </a>
          ) : (
            <span className="text-slate-400 text-[11px]">{c.documentName || "No document"}</span>
          )}
        </td>
        <td className="py-3">
          {c.status === "invite_requested" ? <Chip color="blue">NEW REQUEST</Chip>
            : c.status === "approved" ? (c.inviteEmailed ? <Chip color="emerald">INVITED ✓</Chip> : <Chip color="yellow">APPROVED (EMAIL FAILED)</Chip>)
            : c.status === "rejected_48h" ? <Chip color="red">REJECTED ({c.deadlineHoursRemaining}h)</Chip>
            : <Chip color="yellow">PENDING DOCS</Chip>}
        </td>
        <td className="py-3 font-mono font-bold text-primary">{c.employeeCode || <span className="text-slate-400 font-normal text-[10px]">Pending</span>}</td>
        <td className="py-3">
          {c.status === "pending" && (
            <div className="flex justify-end gap-1">
              <Button size="sm" onClick={() => onApprove(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"><ShieldCheck className="h-3 w-3 mr-0.5" />Approve</Button>
              <Button size="sm" variant="danger" onClick={() => onReject(c.id)} className="text-[10px] font-bold h-7 px-2"><XCircle className="h-3 w-3 mr-0.5" />Reject</Button>
            </div>
          )}
          {c.status === "invite_requested" && (
            <div className="flex justify-end gap-1">
              <Button size="sm" onClick={() => onApprove(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"><MailPlus className="h-3 w-3 mr-0.5" />Approve &amp; Email Invite</Button>
              <Button size="sm" variant="danger" onClick={() => onReject(c.id)} className="text-[10px] font-bold h-7 px-2"><XCircle className="h-3 w-3 mr-0.5" />Reject</Button>
            </div>
          )}
          {c.status === "rejected_48h" && <span className="text-[10px] text-red-500 font-bold">48h Resubmission Active</span>}
          {c.status === "approved" && (
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant={c.inviteEmailed ? "outline" : "default"}
                onClick={doResend}
                disabled={resending}
                className={`text-[10px] font-bold h-7 px-2 ${c.inviteEmailed ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                title={c.inviteEmailed ? "Send a fresh temporary password email again" : "Welcome email failed — resend with a fresh temporary password"}
              >
                {resending ? <Loader2 className="h-3 w-3 mr-0.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-0.5" />}
                Resend welcome email
              </Button>
              {resendMsg && <span className="text-[10px] text-slate-500 dark:text-slate-400 text-right max-w-[220px] break-words" role="status">{resendMsg}</span>}
            </div>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="bg-slate-50/70 dark:bg-white/[0.02]">
          <td colSpan={7} className="py-4 px-4">
            <DetailsPanel details={d!} revealTokens={c.revealTokens} revealing={revealing} candidateId={c.id} onReveal={onReveal} candidate={c} />
          </td>
        </tr>
      )}
    </>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${colors[color]}`}>{children}</span>;
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`block text-xs font-medium text-slate-900 dark:text-white break-words ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function SensitiveFieldRow({
  label, field, value, token, revealing, candidate, onReveal,
}: {
  label: string;
  field: string;
  value?: string;
  token?: string;
  revealing: string | null;
  candidate: Candidate;
  onReveal: (c: Candidate, field: string) => void;
}) {
  const isMasked = value?.includes("•");
  const busy = revealing === `${candidate.id}:${field}`;
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="flex items-center gap-2">
        <span className="block text-xs font-medium font-mono text-slate-900 dark:text-white break-all">{value || "—"}</span>
        {isMasked && token && (
          <button
            type="button"
            onClick={() => onReveal(candidate, field)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20 disabled:opacity-50 shrink-0"
            title="Reveal (audit-logged)"
          >
            {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Eye className="h-2.5 w-2.5" />}
            Reveal
          </button>
        )}
      </span>
    </div>
  );
}

function DetailsPanel({
  details: d,
  revealTokens,
  revealing,
  candidateId,
  candidate,
  onReveal,
}: {
  details: OnboardingDetails;
  revealTokens?: Record<string, string>;
  revealing: string | null;
  candidateId: string;
  candidate: Candidate;
  onReveal: (c: Candidate, field: string) => void;
}) {
  return (
    <div className="space-y-5 max-h-[480px] overflow-y-auto pr-2">
      {/* Personal and Contact Details */}
      <section>
        <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-900 dark:text-white border-l-4 border-primary pl-2 py-0.5 bg-white dark:bg-white/5 rounded-r mb-3">
          <User className="h-3 w-3 text-primary" /> Personal and Contact Details
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Field label="Name as per Aadhar" value={d.employeeName} />
          <Field label="Gender" value={d.gender} />
          <Field label="Designation" value={d.designation} />
          <Field label="Date of Joining" value={d.dateOfJoining} />
          <Field label="Department" value={d.department} />
          <Field label="Date of Birth" value={d.dateOfBirth} />
        </div>
      </section>

      {/* Employment Details */}
      <section>
        <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-900 dark:text-white border-l-4 border-primary pl-2 py-0.5 bg-white dark:bg-white/5 rounded-r mb-3">
          <Briefcase className="h-3 w-3 text-primary" /> Employment Details
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <SensitiveFieldRow label="UAN No" field="uanNo" value={d.uanNo} token={revealTokens?.uanNo} revealing={revealing} candidate={candidate} onReveal={onReveal} />
          <SensitiveFieldRow label="PAN No" field="panNo" value={d.panNo} token={revealTokens?.panNo} revealing={revealing} candidate={candidate} onReveal={onReveal} />
          <SensitiveFieldRow label="Aadhar No" field="aadharNo" value={d.aadharNo} token={revealTokens?.aadharNo} revealing={revealing} candidate={candidate} onReveal={onReveal} />
          <Field label="Mobile No" value={d.mobileNo} />
          <Field label="Joining Location" value={d.joiningLocation} />
          <Field label="Annual CTC" value={d.annualCtc} />
          <Field label="Marital Status" value={d.maritalStatus} />
          {d.maritalStatus === "Yes" && <Field label="Spouse Name" value={d.spouseName} />}
          <Field label="Previous Employer PF" value={d.hasPf} />
          {d.hasPf === "Yes" && <Field label="Previous PF Number" value={d.previousPfNumber} />}
          <Field label="EPF Salary" value={d.epfSalary} />
          <Field label="Previous ESI No" value={d.previousEsiNo} />
          <Field label="ESIC Dispensary" value={d.esicDispensary} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Present Address" value={d.presentAddress} />
          <Field label="Permanent Address" value={d.permanentAddress} />
        </div>
      </section>

      {/* Nominee Details */}
      <section>
        <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-900 dark:text-white border-l-4 border-primary pl-2 py-0.5 bg-white dark:bg-white/5 rounded-r mb-3">
          <Users className="h-3 w-3 text-primary" /> Nominee Details
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Field label="Nominee Name" value={d.nomineeName} />
          <Field label="Nominee DOB" value={d.nomineeDob} />
          <SensitiveFieldRow label="Nominee Aadhar" field="nomineeAadhar" value={d.nomineeAadhar} token={revealTokens?.nomineeAadhar} revealing={revealing} candidate={candidate} onReveal={onReveal} />
          <Field label="Relation with Nominee" value={d.nomineeRelation} />
          <Field label="Father Name" value={d.fatherName} />
          {d.maritalStatus === "Yes" && <Field label="Husband's Name" value={d.husbandName} />}
        </div>
      </section>

      {/* Bank Details */}
      <section>
        <h4 className="flex items-center gap-2 text-[11px] font-extrabold text-slate-900 dark:text-white border-l-4 border-primary pl-2 py-0.5 bg-white dark:bg-white/5 rounded-r mb-3">
          <Landmark className="h-3 w-3 text-primary" /> Bank Details
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Field label="Name in Bank" value={d.nameInBank} />
          <SensitiveFieldRow label="Bank Account Number" field="bankAccountNumber" value={d.bankAccountNumber} token={revealTokens?.bankAccountNumber} revealing={revealing} candidate={candidate} onReveal={onReveal} />
          <Field label="Bank Name" value={d.bankName} />
          <Field label="Branch Name" value={d.branchName} />
          <Field label="IFSC Code" value={d.ifscCode} mono />
        </div>
      </section>

      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <Eye className="h-3 w-3" />
        Aadhar, PAN, and bank account numbers are masked. Revealing a value is recorded in the audit log.
      </p>
    </div>
  );
}
