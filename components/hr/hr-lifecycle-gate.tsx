"use client";

import { useState } from "react";
import {
  UserCheck,
  Shield,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LifecycleGateProps {
  lifecycle: {
    onboardingQueue: any[];
    probationConfirmations: any[];
    exitClearances: any[];
    managerApprovedExpenses: any[];
  };
  onRefresh: () => void;
}

export function HrLifecycleGate({ lifecycle, onRefresh }: LifecycleGateProps) {
  const [activeTab, setActiveTab] = useState<"onboarding" | "probation" | "exit" | "expenses">("onboarding");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Approve Candidate
  const handleApproveCandidate = async (taskId: string, name: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      setFeedback({ type: "success", text: `Candidate ${name} approved. Employee code ${data?.data?.employeeCode || "issued"}.` });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Approval failed" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject Candidate
  const handleRejectCandidate = async (taskId: string, name: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId, status: "rejected" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");
      setFeedback({ type: "success", text: `Candidate ${name} rejected. 48-hour resubmission clock started.` });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Rejection failed" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm Probation
  const handleConfirmProbation = async (userId: string, name: string) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch("/api/hrm/v2/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, probationStatus: "confirmed" }),
      });
      if (!res.ok) throw new Error("Failed to confirm probation");
      setFeedback({ type: "success", text: `${name} confirmed as permanent employee (Notice period updated to 60 days).` });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to confirm probation" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Payout Expense
  const handlePayoutExpense = async (expenseId: string, name: string) => {
    setActionLoadingId(expenseId);
    try {
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expenseId, action: "reimburse" }),
      });
      if (!res.ok) throw new Error("Failed to reimburse expense");
      setFeedback({ type: "success", text: `Reimbursement processed for ${name}.` });
      setTimeout(() => setFeedback(null), 3500);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Payout failed" });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Employee Lifecycle Clearance Gates
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Manage Onboarding verification, Probation confirmations, Exit FnF clearances, and Expense payouts.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 overflow-x-auto self-start sm:self-auto">
          {[
            { id: "onboarding", label: `Onboarding (${lifecycle.onboardingQueue.length})` },
            { id: "probation", label: `Probation (${lifecycle.probationConfirmations.length})` },
            { id: "exit", label: `Exit FnF (${lifecycle.exitClearances.length})` },
            { id: "expenses", label: `Expense Desk (${lifecycle.managerApprovedExpenses.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
          feedback.type === "success"
            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            : "bg-danger/10 text-danger border border-danger/20"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Tab 1: Onboarding Queue ── */}
      {activeTab === "onboarding" && (
        <div className="space-y-2.5">
          {lifecycle.onboardingQueue.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              No pending candidates in verification queue.
            </div>
          ) : (
            lifecycle.onboardingQueue.map((c) => {
              const isLoading = actionLoadingId === c.id;
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{c.name}</span>
                      <span className="text-muted-foreground">({c.email})</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.department} · {c.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 text-primary">
                        <FileText className="w-3.5 h-3.5" /> {c.documentName}
                      </span>
                      {c.status.includes("reject") ? (
                        <span className="text-danger font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 48h Deadline Clock Running
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Awaiting Document Verification
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => handleRejectCandidate(c.id, c.name)}
                      className="h-8 text-xs text-danger hover:bg-danger/10 hover:text-danger rounded-xl"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleApproveCandidate(c.id, c.name)}
                      className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      Approve & Issue Code
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 2: Probation Confirmations ── */}
      {activeTab === "probation" && (
        <div className="space-y-2.5">
          {lifecycle.probationConfirmations.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              No new hires currently due for probation confirmation.
            </div>
          ) : (
            lifecycle.probationConfirmations.map((p) => {
              const isLoading = actionLoadingId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{p.name}</span>
                      <span className="font-mono text-primary font-bold text-[11px]">{p.employeeCode}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.designation} · {p.department}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Completed {p.daysInProbation} days. Confirmation updates notice period from 15 days to statutory 60 days.
                    </p>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleConfirmProbation(p.id, p.name)}
                      className="h-8 text-xs font-semibold rounded-xl bg-primary text-white"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      Confirm Employee
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 3: Exit FnF Settlements ── */}
      {activeTab === "exit" && (
        <div className="space-y-2.5">
          {lifecycle.exitClearances.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              No active exit settlements or FnF clearance workflows.
            </div>
          ) : (
            lifecycle.exitClearances.map((e) => (
              <div
                key={e.id}
                className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{e.employeeName}</span>
                    <Badge variant="outline" className="text-[10px]">{e.department}</Badge>
                    <span className="text-[10px] text-muted-foreground">LWD: {e.lastWorkingDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] pt-1">
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${e.clearanceStatus.it === "cleared" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      IT: {e.clearanceStatus.it}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${e.clearanceStatus.finance === "cleared" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      Finance: {e.clearanceStatus.finance}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${e.clearanceStatus.admin === "cleared" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      Admin: {e.clearanceStatus.admin}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${e.clearanceStatus.hr === "cleared" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                      HR: {e.clearanceStatus.hr}
                    </span>
                  </div>
                </div>

                <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl self-end sm:self-auto">
                  Audit Settlement
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab 4: Expense Payout Desk ── */}
      {activeTab === "expenses" && (
        <div className="space-y-2.5">
          {lifecycle.managerApprovedExpenses.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
              No manager-approved expense claims waiting for disbursement.
            </div>
          ) : (
            lifecycle.managerApprovedExpenses.map((exp) => {
              const isLoading = actionLoadingId === exp.id;
              return (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{exp.employeeName}</span>
                      <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(exp.amount).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Manager sign-off completed. Ready for bank disbursement payout.
                    </p>
                  </div>

                  <div className="shrink-0 self-end sm:self-auto">
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handlePayoutExpense(exp.id, exp.employeeName)}
                      className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <DollarSign className="w-3.5 h-3.5 mr-1" />}
                      Disburse Payout
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
