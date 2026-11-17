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
  CheckCircle2,
  Calendar,
  AlertCircle,
  Coffee,
  DollarSign,
  Search,
  ShieldCheck,
} from "lucide-react";

interface OvertimeRecord {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
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
  rejectionReason?: string;
  createdAt: string;
}

export default function HrAdminOvertimePage() {
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Rejection Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/attendance/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "approve" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/attendance/overtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectId, action: "reject", rejectionReason: rejectReason.trim() }),
      });
      if (res.ok) {
        setRejectId(null);
        setRejectReason("");
        await fetchData();
      }
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = records.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      !search ||
      r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Overtime & Comp-Off Approvals"
          subtitle="Audit extra hours worked, approve 1.5x payroll compensation, or automatically credit compensatory off leave balances"
        />

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "pending", "approved", "credited", "rejected"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="capitalize text-xs"
              >
                {st}
              </Button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Schedule vs Punch</th>
                  <th className="py-3 px-4 text-right">Overtime</th>
                  <th className="py-3 px-4">Requested Benefit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading overtime claims...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <p className="font-medium text-muted-foreground">No overtime claims found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground text-sm">{r.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{r.department || "General"}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs font-medium">
                        {r.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs text-muted-foreground">Shift: {r.shiftStartTime} - {r.shiftEndTime}</p>
                        <p className="text-xs font-mono font-medium text-foreground mt-0.5">Actual: {r.actualCheckIn} - {r.actualCheckOut}</p>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {(r.overtimeMinutes / 60).toFixed(1)} hrs
                      </td>
                      <td className="py-3.5 px-4">
                        {r.compensationType === "comp_off" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Coffee className="h-3.5 w-3.5" /> +{r.compOffDaysCredited} Comp-Off Day
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400">
                            <DollarSign className="h-3.5 w-3.5" /> ₹{Number(r.overtimePay).toLocaleString()} (1.5x Pay)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === "credited" && <Badge variant="success">Credited to Leave</Badge>}
                        {r.status === "approved" && <Badge variant="info">Approved for Pay</Badge>}
                        {r.status === "pending" && <Badge variant="warning">Pending</Badge>}
                        {r.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoading}
                              className="h-8 text-xs font-medium"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => setRejectId(r.id)}
                              disabled={actionLoading}
                              className="h-8 text-xs font-medium"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {r.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Reject Modal */}
        <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Reject Overtime Claim</DialogTitle>
              <DialogDescription>
                Provide an audit note explaining why this overtime claim was rejected.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <label className="text-xs font-semibold text-foreground">Rejection Reason *</label>
              <textarea
                rows={3}
                placeholder="e.g. Overtime was not pre-authorized by reporting manager"
                className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRejectId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
              >
                Confirm Rejection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
