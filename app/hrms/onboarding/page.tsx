"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { UserCheck, FileText, CheckCircle2, Clock, ShieldCheck, Upload, IdCard, AlertCircle, XCircle, AlertTriangle, FileUp } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface CandidateApplication {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  documentName: string;
  status: "DOCUMENT_VERIFICATION_PENDING" | "APPROVED" | "REJECTED_48H_DEADLINE" | "CANCELLED";
  employeeCode?: string;
  submittedAt: string;
  deadlineHoursRemaining?: number;
}

const initialApplications: CandidateApplication[] = [
  {
    id: "app-101",
    name: "Shivangi Gupta",
    email: "shivangi@company.com",
    role: "Frontend Engineer",
    department: "Engineering",
    documentName: "Government_Aadhaar_Passport.pdf",
    status: "DOCUMENT_VERIFICATION_PENDING",
    submittedAt: "2026-08-19",
  },
  {
    id: "app-102",
    name: "Rohan Verma",
    email: "rohan.v@company.com",
    role: "Sales Associate",
    department: "Sales",
    documentName: "Invalid_Blurry_Doc.pdf",
    status: "REJECTED_48H_DEADLINE",
    submittedAt: "2026-08-18",
    deadlineHoursRemaining: 47,
  },
  {
    id: "app-103",
    name: "Priya Sharma",
    email: "priya.s@company.com",
    role: "UI/UX Designer",
    department: "Design",
    documentName: "Government_ID_Proof.pdf",
    status: "APPROVED",
    employeeCode: "EMP-2026-1004",
    submittedAt: "2026-08-17",
  },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<CandidateApplication[]>(initialApplications);
  const [rejectReasonModal, setRejectReasonModal] = useState<string | null>(null);

  const isHR = user?.role === "super_admin" || user?.role === "hr_admin" || !user?.role;

  const handleApprove = (appId: string) => {
    const randomCode = `EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, status: "APPROVED", employeeCode: randomCode, deadlineHoursRemaining: undefined }
          : app
      )
    );
  };

  const handleRejectWith48hDeadline = (appId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, status: "REJECTED_48H_DEADLINE", deadlineHoursRemaining: 48 }
          : app
      )
    );
    setRejectReasonModal(null);
  };

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
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
          <UserCheck className="h-5 w-5 text-primary" /> Registered Applications &amp; Document Approvals
        </h3>

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
                    <span className="inline-flex items-center gap-1 text-primary font-mono text-[11px] underline cursor-pointer font-bold">
                      <FileText className="h-3.5 w-3.5" /> {app.documentName}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-slate-500">{app.submittedAt}</td>
                  <td className="py-3">
                    {app.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED &amp; APPROVED
                      </span>
                    ) : app.status === "REJECTED_48H_DEADLINE" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3 animate-pulse" /> REJECTED (48H DEADLINE: {app.deadlineHoursRemaining || 48}h)
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
                      {app.status === "DOCUMENT_VERIFICATION_PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleApprove(app.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectWith48hDeadline(app.id)}
                            variant="danger"
                            className="font-bold text-xs h-8 px-3"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject (48h Clock)
                          </Button>
                        </div>
                      ) : app.status === "REJECTED_48H_DEADLINE" ? (
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
      </div>
    </AppShell>
  );
}
