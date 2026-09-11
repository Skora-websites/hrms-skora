"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { UserCheck, FileText, CheckCircle2, Clock, ShieldCheck, XCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

interface CandidateApplication {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  documentName: string;
  documentUrl?: string;
  status: "pending" | "rejected" | "escalated" | "approved";
  employeeCode?: string;
  submittedAt: string;
  rejectionDeadline?: string;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isHR = user?.role === "super_admin" || user?.role === "hr_admin" || user?.role === "admin";

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/onboarding?pending=true");
      if (res.ok) {
        const data = await res.json();
        setApplications(Array.isArray(data.data) ? data.data : []);
      }
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Employees have nothing to approve here — send them to their own hub,
    // which carries the personal onboarding status banner instead.
    if (user && user.role === "employee") {
      router.replace("/hrms/employee");
      return;
    }
    if (user) loadApplications();
  }, [user, router, loadApplications]);

  const handleApprove = async (appId: string) => {
    setBusyId(appId);
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: appId, status: "approved" }),
      });
      if (res.ok) {
        const data = await res.json();
        setApplications((prev) =>
          prev.map((app) =>
            app.id === appId
              ? { ...app, status: "approved", employeeCode: data.data?.employeeCode, rejectionDeadline: undefined }
              : app
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (appId: string) => {
    setBusyId(appId);
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: appId, status: "rejected" }),
      });
      if (res.ok) {
        const data = await res.json();
        const deadline = data.data?.rejectionDeadline;
        setApplications((prev) =>
          prev.map((app) =>
            app.id === appId ? { ...app, status: "rejected", rejectionDeadline: deadline } : app
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const remainingHours = (deadline?: string) =>
    deadline ? Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 3600000)) : 48;

  return (
    <AppShell title="Employee Onboarding & HR Document Approval">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Onboarding &amp; Document Verification Portal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review candidate documents, issue official Employee Codes, or trigger 48-Hour Resubmission Deadlines
          </p>
        </div>
      </div>

      {/* Onboarding Applications Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
          <UserCheck className="h-5 w-5 text-primary" /> Registered Applications &amp; Document Approvals
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No pending onboarding applications.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Candidate</th>
                  <th className="pb-3 font-semibold">Role &amp; Dept</th>
                  <th className="pb-3 font-semibold">Verification File</th>
                  <th className="pb-3 font-semibold">Submitted Date</th>
                  <th className="pb-3 font-semibold">Verification Status</th>
                  <th className="pb-3 font-semibold">Employee Code</th>
                  {isHR && <th className="pb-3 font-semibold text-right">HR Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {app.name}
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">{app.email}</span>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold block">{app.role}</span>
                      <span className="text-[10px] text-slate-500">{app.department}</span>
                    </td>
                    <td className="py-3">
                      {app.documentUrl ? (
                        <a href={app.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-mono text-[11px] underline hover:text-primary/80 font-bold">
                          <FileText className="h-3.5 w-3.5" /> {app.documentName || "View"}
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No document</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-slate-500">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}</td>
                    <td className="py-3">
                      {app.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> VERIFIED &amp; APPROVED
                        </span>
                      ) : app.status === "rejected" || app.status === "escalated" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-3 w-3 animate-pulse" /> REJECTED (48H DEADLINE: {remainingHours(app.rejectionDeadline)}h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-3 w-3 animate-pulse" /> DOCUMENT VERIFICATION PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 font-mono font-bold text-primary">
                      {app.employeeCode ? app.employeeCode : <span className="text-slate-400 font-normal text-[11px]">Pending HR Approval</span>}
                    </td>
                    {isHR && (
                      <td className="py-3 text-right">
                        {app.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleApprove(app.id)}
                              disabled={busyId === app.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(app.id)}
                              disabled={busyId === app.id}
                              variant="danger"
                              className="font-bold text-xs h-8 px-3"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject (48h Clock)
                            </Button>
                          </div>
                        ) : app.status === "rejected" || app.status === "escalated" ? (
                          <span className="text-[10px] text-red-500 font-bold">48h Resubmission Active</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Finalized</span>
                        )}
                      </td>
                    )}
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
