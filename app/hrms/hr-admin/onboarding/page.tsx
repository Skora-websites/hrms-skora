"use client";

import { useState, useEffect } from "react";
import { UserCheck, FileText, CheckCircle2, Clock, ShieldCheck, XCircle, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  documentName: string;
  documentUrl?: string;
  status: "pending" | "approved" | "rejected_48h";
  employeeCode?: string;
  submittedAt: string;
  deadlineHoursRemaining?: number;
}

export default function HrAdminOnboardingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCandidates();
  }, []);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/onboarding?pending=true");
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data.data) ? data.data : [];
        setCandidates(rows.map((t: any) => ({
          id: t.id || t._id || "",
          name: t.employeeName || t.name || "",
          email: t.email || "",
          role: t.role || "Employee",
          department: t.department || "—",
          documentName: t.documentName || "",
          documentUrl: t.documentUrl || "",
          status: (t.status === "rejected" || t.status === "escalated" ? "rejected_48h" : t.status === "approved" ? "approved" : "pending") as Candidate["status"],
          employeeCode: t.employeeCode,
          submittedAt: t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : "—",
          deadlineHoursRemaining: t.rejectionDeadline
            ? Math.max(0, Math.round((new Date(t.rejectionDeadline).getTime() - Date.now()) / 3600000))
            : undefined,
        })));
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    try {
      // Server issues the employee code, activates the account, and persists it.
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: id, status: "approved" }),
      });
      if (res.ok) {
        const data = await res.json();
        const code = data.data?.employeeCode;
        setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, status: "approved" as const, employeeCode: code } : c));
        return;
      }
      console.error("Approve failed:", (await res.json().catch(() => ({}))).error);
    } catch (err) {
      console.error("Failed to approve onboarding:", err);
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding &amp; Document Verification</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review candidate documents, issue Employee Codes, or trigger 48-hour resubmission deadlines
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" /> Registered Applications
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading candidates...</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No pending onboarding applications.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Candidate</th>
                  <th className="pb-3 font-semibold">Role / Dept</th>
                  <th className="pb-3 font-semibold">Document</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Employee Code</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {candidates.map((c) => (
                  <tr key={c.id}>
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
                      {c.status === "approved" ? <Chip color="emerald">VERIFIED</Chip>
                        : c.status === "rejected_48h" ? <Chip color="red">REJECTED ({c.deadlineHoursRemaining}h)</Chip>
                        : <Chip color="yellow">PENDING</Chip>}
                    </td>
                    <td className="py-3 font-mono font-bold text-primary">{c.employeeCode || <span className="text-slate-400 font-normal text-[10px]">Pending</span>}</td>
                    <td className="py-3 text-right">
                      {c.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => handleApprove(c.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"><ShieldCheck className="h-3 w-3 mr-0.5" />Approve</Button>
                          <Button size="sm" variant="danger" onClick={() => handleReject(c.id)} className="text-[10px] font-bold h-7 px-2"><XCircle className="h-3 w-3 mr-0.5" />Reject</Button>
                        </div>
                      )}
                      {c.status === "rejected_48h" && <span className="text-[10px] text-red-500 font-bold">48h Resubmission Active</span>}
                      {c.status === "approved" && <span className="text-[10px] text-slate-400">Finalized</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${colors[color]}`}>{children}</span>;
}
