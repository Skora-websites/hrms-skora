"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Info,
} from "lucide-react";

interface AccrualData {
  userId: string;
  month: string;
  daysInMonth: number;
  daysPassed: number;
  daysWorked: number;
  monthlyGross: number;
  dailyRate: number;
  accruedWage: number;
  maxEligiblePercentage: number;
  maxAdvanceAllowed: number;
  alreadyRequestedThisMonth: number;
  currentAvailableAdvance: number;
  currency: string;
}

interface AdvanceRequest {
  id: string;
  requestedAmount: number;
  maxEligibleAmount: number;
  accruedWage: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "disbursed" | "deducted";
  approvedByName?: string;
  disbursedAt?: string;
  deductedPayrollMonth?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function SalaryAdvancePage() {
  const [accrual, setAccrual] = useState<AccrualData | null>(null);
  const [history, setHistory] = useState<AdvanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [requestedAmount, setRequestedAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accrualRes, listRes] = await Promise.all([
        fetch("/api/hrm/v2/payroll/salary-advance?eligibility=true"),
        fetch("/api/hrm/v2/payroll/salary-advance"),
      ]);

      const accrualJson = await accrualRes.json();
      const listJson = await listRes.json();

      if (accrualJson.success && accrualJson.data) {
        setAccrual(accrualJson.data);
      }
      if (listJson.success && Array.isArray(listJson.data)) {
        setHistory(listJson.data);
      }
    } catch (err) {
      console.error("Failed to load salary advance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickSelect = (amt: number) => {
    setRequestedAmount(String(amt));
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const num = Number(requestedAmount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }

    if (accrual && num > accrual.currentAvailableAdvance) {
      setErrorMsg(`Amount cannot exceed available limit of ₹${accrual.currentAvailableAdvance.toLocaleString()}`);
      return;
    }

    if (!reason.trim()) {
      setErrorMsg("Please provide a reason for the advance request");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/payroll/salary-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedAmount: num,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit advance request");
      }

      setModalOpen(false);
      setRequestedAmount("");
      setReason("");
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit advance request");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: AdvanceRequest["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "disbursed":
        return <Badge variant="info">Disbursed to Bank</Badge>;
      case "deducted":
        return <Badge variant="secondary">Deducted from Payslip</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending HR Approval</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Earned Wage Access (EWA)"
          subtitle="Access your earned salary before regular monthly payday with zero interest and seamless payroll auto-deduction"
          action={
            <Button
              onClick={() => setModalOpen(true)}
              disabled={!accrual || accrual.currentAvailableAdvance <= 0}
              className="gap-2 shadow-xs"
            >
              <CreditCard className="h-4 w-4" /> Request Salary Advance
            </Button>
          }
        />

        {/* EWA Accrued Salary Showcase Card */}
        <Card className="border border-border/70 shadow-xs bg-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="subtle" className="text-xs">
                    Real-time Accrual Engine
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">Month: {accrual?.month || "Current"}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Available for Immediate Advance</p>
                  <h2 className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
                    ₹{Number(accrual?.currentAvailableAdvance || 0).toLocaleString()}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  Eligible up to 50% of wages earned so far this month, minus active draws.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground font-medium">Days Worked</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {accrual?.daysWorked || 0} <span className="text-xs font-normal text-muted-foreground">/ {accrual?.daysInMonth || 30}</span>
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <p className="text-xs text-muted-foreground font-medium">Accrued Earnings</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₹{Number(accrual?.accruedWage || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 col-span-2 sm:col-span-1">
                  <p className="text-xs text-muted-foreground font-medium">Already Drawn</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    ₹{Number(accrual?.alreadyRequestedThisMonth || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Accrual Progress Bar */}
            <div className="mt-6 pt-5 border-t border-border/60 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Month Progress ({Math.round(((accrual?.daysPassed || 1) / (accrual?.daysInMonth || 30)) * 100)}%)</span>
                <span>Payday in {(accrual?.daysInMonth || 30) - (accrual?.daysPassed || 1)} days</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((accrual?.daysWorked || 1) / (accrual?.daysInMonth || 30)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advance History */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground text-base">Salary Advance Requests</h3>

          <Card className="border border-border/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Request Date</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4 text-right">Requested Amount</th>
                    <th className="py-3 px-4">Deduction Cycle</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-muted-foreground">
                        Loading advance history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                          <DollarSign className="h-8 w-8 stroke-1 text-muted-foreground/40" />
                          <p className="font-medium text-foreground">No salary advance requests yet</p>
                          <p className="text-xs">You can draw an advance from your accrued wages whenever an emergency arises.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    history.map((adv) => (
                      <tr key={adv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs font-medium">
                          {new Date(adv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-foreground text-sm">{adv.reason}</p>
                          {adv.rejectionReason && (
                            <p className="text-xs text-destructive mt-1 font-medium">Rejected: {adv.rejectionReason}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-foreground">
                          ₹{Number(adv.requestedAmount).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                          {adv.deductedPayrollMonth || "Current Month"}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(adv.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Request Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Request Salary Advance</DialogTitle>
              <DialogDescription>
                Draw an advance against wages already earned. Zero fees, zero interest.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/70 text-xs space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Available Eligibility:</span>
                  <span className="font-bold text-primary">₹{Number(accrual?.currentAvailableAdvance || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Accrued Wages This Month:</span>
                  <span>₹{Number(accrual?.accruedWage || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Quick Select Amount</label>
                <div className="flex gap-2">
                  {[1000, 2500, 5000].map((amt) => (
                    <Button
                      key={amt}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickSelect(amt)}
                      disabled={accrual ? amt > accrual.currentAvailableAdvance : false}
                      className="text-xs flex-1"
                    >
                      ₹{amt.toLocaleString()}
                    </Button>
                  ))}
                  {accrual && accrual.currentAvailableAdvance > 0 && (
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleQuickSelect(accrual.currentAvailableAdvance)}
                      className="text-xs font-medium"
                    >
                      Max (₹{accrual.currentAvailableAdvance.toLocaleString()})
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Advance Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 3000"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  max={accrual?.currentAvailableAdvance || 0}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Reason for Advance *</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. Medical prescription, urgent vehicle maintenance..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Repayment Terms
                </p>
                <p>
                  This advance will be deducted automatically from your next monthly payslip (Cycle: {accrual?.month || "Current"}).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Submitting..." : "Confirm & Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
