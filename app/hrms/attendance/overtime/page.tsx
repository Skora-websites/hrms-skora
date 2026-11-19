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
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Briefcase,
  DollarSign,
  Coffee,
} from "lucide-react";

interface OvertimeRecord {
  id: string;
  date: string;
  shiftStartTime: string;
  shiftEndTime: string;
  actualCheckIn: string;
  actualCheckOut: string;
  shiftMinutes: number;
  actualMinutes: number;
  overtimeMinutes: number;
  compensationType: "pay" | "comp_off";
  hourlyRate: number;
  overtimePay: number;
  compOffDaysCredited: number;
  status: "pending" | "approved" | "rejected" | "credited";
  approvedByName?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function OvertimePage() {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Claim Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    shiftStartTime: "09:00",
    shiftEndTime: "18:00",
    actualCheckIn: "09:00",
    actualCheckOut: "21:30",
    compensationType: "comp_off" as "pay" | "comp_off",
    hourlyRate: "250",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hrm/v2/attendance/overtime");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRecords(json.data);
      }
    } catch (err) {
      console.error("Failed to load overtime records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateHours = (start: string, end: string) => {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    const diff = (eH * 60 + eM) - (sH * 60 + sM);
    return Math.max(0, diff);
  };

  const actualMinutes = calculateHours(formData.actualCheckIn, formData.actualCheckOut);
  const shiftMinutes = calculateHours(formData.shiftStartTime, formData.shiftEndTime);
  const overtimeMinutes = Math.max(0, actualMinutes - shiftMinutes);
  const overtimeHours = (overtimeMinutes / 60).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (overtimeMinutes < 30) {
      setErrorMsg("Overtime must be at least 30 minutes beyond shift end");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/attendance/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          shiftStartTime: formData.shiftStartTime,
          shiftEndTime: formData.shiftEndTime,
          actualCheckIn: formData.actualCheckIn,
          actualCheckOut: formData.actualCheckOut,
          shiftMinutes,
          actualMinutes,
          compensationType: formData.compensationType,
          hourlyRate: Number(formData.hourlyRate || 250),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit overtime claim");
      }

      setModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit overtime claim");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalOtHours = (
    records.reduce((sum, r) => sum + Number(r.overtimeMinutes || 0), 0) / 60
  ).toFixed(1);

  const totalCompOffEarned = records
    .filter((r) => r.status === "approved" || r.status === "credited")
    .reduce((sum, r) => sum + Number(r.compOffDaysCredited || 0), 0);

  const totalOtPay = records
    .filter((r) => r.compensationType === "pay" && (r.status === "approved" || r.status === "credited"))
    .reduce((sum, r) => sum + Number(r.overtimePay || 0), 0);

  const getStatusBadge = (status: OvertimeRecord["status"]) => {
    switch (status) {
      case "credited":
        return <Badge variant="success">Comp-Off Credited</Badge>;
      case "approved":
        return <Badge variant="info">Approved for Pay</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="warning">Pending Approval</Badge>;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Overtime & Comp-Off Engine"
          subtitle="Track overtime hours, claim 1.5x payroll compensation, or bank compensatory off leave credits"
          action={
            <Button onClick={() => setModalOpen(true)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" /> Claim Overtime
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Overtime Hours</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">{totalOtHours} hrs</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Coffee className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Comp-Off Credited</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">{totalCompOffEarned} days</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Approved Overtime Pay</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">₹{totalOtPay.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overtime Claims Table */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border/70 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Shift Schedule</th>
                  <th className="py-3 px-4">Actual Punch</th>
                  <th className="py-3 px-4 text-right">Overtime</th>
                  <th className="py-3 px-4">Compensation Choice</th>
                  <th className="py-3 px-4 text-right">Benefit</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading overtime records…
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <Clock className="h-8 w-8 stroke-1 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">No overtime claims recorded</p>
                        <p className="text-xs">Click "Claim Overtime" above when you work extra hours beyond your standard shift.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-foreground text-xs">
                        {r.date}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs font-medium">
                        {r.shiftStartTime} - {r.shiftEndTime}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-mono text-xs">
                        {r.actualCheckIn} - {r.actualCheckOut}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {(r.overtimeMinutes / 60).toFixed(1)} hrs
                      </td>
                      <td className="py-3.5 px-4">
                        {r.compensationType === "comp_off" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Coffee className="h-3.5 w-3.5" /> Comp-Off Leave
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                            <DollarSign className="h-3.5 w-3.5" /> 1.5x Pay
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {r.compensationType === "comp_off" ? (
                          `+${r.compOffDaysCredited} day`
                        ) : (
                          `₹${Number(r.overtimePay).toLocaleString()}`
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Claim Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Claim Overtime</DialogTitle>
              <DialogDescription>
                Submit extra hours worked beyond your shift schedule for compensation or leave banking.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Overtime Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Shift Start</label>
                  <input
                    type="time"
                    value={formData.shiftStartTime}
                    onChange={(e) => setFormData({ ...formData, shiftStartTime: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Shift End</label>
                  <input
                    type="time"
                    value={formData.shiftEndTime}
                    onChange={(e) => setFormData({ ...formData, shiftEndTime: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Actual Check In</label>
                  <input
                    type="time"
                    value={formData.actualCheckIn}
                    onChange={(e) => setFormData({ ...formData, actualCheckIn: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Actual Check Out *</label>
                  <input
                    type="time"
                    value={formData.actualCheckOut}
                    onChange={(e) => setFormData({ ...formData, actualCheckOut: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Calculated Delta */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Calculated Overtime:</span>
                <span className="font-bold text-foreground text-sm">{overtimeHours} Hours ({overtimeMinutes} mins)</span>
              </div>

              {/* Compensation Radio */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Preferred Compensation *</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, compensationType: "comp_off" })}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${
                      formData.compensationType === "comp_off"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <Coffee className="h-4 w-4" /> Comp-Off Credit
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      Bank leave balance (0.5 day for 4h, 1 day for 8h)
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, compensationType: "pay" })}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors duration-150 ${
                      formData.compensationType === "pay"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/70 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs">
                      <DollarSign className="h-4 w-4" /> 1.5x Overtime Pay
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      Cash payout integrated with your next payslip
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting || overtimeMinutes < 30}>
                  {submitting ? "Submitting..." : "Submit Claim"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
