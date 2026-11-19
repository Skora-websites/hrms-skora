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
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  ExternalLink,
  AlertCircle,
  Users,
  Send,
  Eye,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Expense {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  merchant?: string;
  description?: string;
  receiptUrl?: string;
  status: "pending" | "pending_manager" | "manager_approved" | "approved" | "rejected" | "reimbursed";
  rejectionReason?: string;
  managerApprovedByName?: string;
  managerApprovedAt?: string;
  approvedByName?: string;
  reimbursedAt?: string;
  createdAt: string;
}

export default function ManagerExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalReimbursed: 0,
    pendingManagerCount: 0,
    managerApprovedCount: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Rejection Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, statsRes] = await Promise.all([
        fetch("/api/hrm/v2/expenses?scope=team"),
        fetch("/api/hrm/v2/expenses?scope=team&stats=true"),
      ]);

      const expData = await expRes.json();
      const statsData = await statsRes.json();

      if (expData.success && Array.isArray(expData.data)) {
        setExpenses(expData.data);
      }
      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
    } catch (err) {
      console.error("Failed to fetch manager team expenses:", err);
      showToast("Error loading team expense claims", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManagerApprove = async (id: string, empName: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "manager_approve" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Approved ${empName}'s claim. Forwarded to HR desk.`);
        await fetchData();
      } else {
        showToast(data.error || "Approval failed", "error");
      }
    } catch (err) {
      showToast("Network error approving claim", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectId,
          action: "reject",
          rejectionReason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Claim rejected and employee notified.");
        setRejectId(null);
        setRejectReason("");
        await fetchData();
      } else {
        showToast(data.error || "Rejection failed", "error");
      }
    } catch (err) {
      showToast("Network error rejecting claim", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    let matchesStatus = true;
    if (statusFilter === "pending") {
      matchesStatus = e.status === "pending" || e.status === "pending_manager";
    } else if (statusFilter !== "all") {
      matchesStatus = e.status === statusFilter;
    }

    const matchesSearch =
      !search ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: Expense["status"]) => {
    switch (status) {
      case "pending":
      case "pending_manager":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
            Pending Your Review
          </Badge>
        );
      case "manager_approved":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
            Endorsed → In HR Queue
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            Approved by HR
          </Badge>
        );
      case "reimbursed":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
            Reimbursed
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppShell>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Team Expense Approvals"
          subtitle="Review and endorse business reimbursement claims submitted by your direct reporting team members"
        />

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Pending Your Review</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  {stats.pendingManagerCount || 0} claims
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Endorsed to HR</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  {stats.managerApprovedCount || 0} claims
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Team Approved</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalApproved || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Team Claimed</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalClaimed || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Claims Table Card */}
        <Card className="border border-border/70 shadow-xs">
          <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
                className="text-xs"
              >
                Needs Review ({stats.pendingManagerCount || 0})
              </Button>
              <Button
                variant={statusFilter === "manager_approved" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("manager_approved")}
                className="text-xs"
              >
                In HR Queue ({stats.managerApprovedCount || 0})
              </Button>
              <Button
                variant={statusFilter === "reimbursed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("reimbursed")}
                className="text-xs"
              >
                Reimbursed
              </Button>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-xs"
              >
                All Team Claims
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category &amp; Details</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      Loading team expense claims...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      No expense claims found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground text-xs leading-none">{exp.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{exp.employeeEmail}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-foreground text-xs">{exp.category}</span>
                        {exp.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{exp.description}</p>
                        )}
                        {exp.status === "rejected" && exp.rejectionReason && (
                          <p className="text-[11px] text-destructive mt-1 font-medium">
                            Rejected: {exp.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs">
                        {exp.expenseDate}
                      </td>
                      <td className="py-3.5 px-4 text-foreground text-xs font-medium">
                        {exp.merchant || "N/A"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        ₹{Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {exp.receiptUrl ? (
                          <a
                            href={exp.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(exp.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {(exp.status === "pending" || exp.status === "pending_manager") ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={actionLoading}
                              onClick={() => handleManagerApprove(exp.id, exp.employeeName)}
                              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Endorse
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => {
                                setRejectId(exp.id);
                                setRejectReason("");
                              }}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : exp.status === "manager_approved" ? (
                          <span className="text-xs text-muted-foreground font-medium">In HR Review</span>
                        ) : (
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

        {/* Rejection Dialog */}
        <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Reject Expense Claim</DialogTitle>
              <DialogDescription>
                Provide a specific reason for rejection so the employee understands why their claim was not endorsed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Rejection Reason *</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Ineligible bill date, missing original GST invoice, personal expense..."
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectId(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
