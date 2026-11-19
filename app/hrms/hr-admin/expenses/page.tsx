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
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  Settings2,
  Download,
  Building2,
  CreditCard,
  Send,
} from "lucide-react";

interface Expense {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department?: string;
  managerId?: string;
  managerName?: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  merchant?: string;
  description?: string;
  receiptUrl?: string;
  status: "pending" | "pending_manager" | "manager_approved" | "approved" | "rejected" | "reimbursed";
  managerApprovedByName?: string;
  managerApprovedAt?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reimbursedAt?: string;
  payoutMethod?: "payroll" | "direct_transfer";
  paymentReference?: string;
  paymentMode?: string;
  payrollRunId?: string;
  createdAt: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  monthlyCap: number;
  requiresReceipt: boolean;
  description?: string;
}

export default function HrAdminExpensesPage() {
  const [activeTab, setActiveTab] = useState<"claims" | "categories" | "analytics">("claims");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalReimbursed: 0,
    pendingManagerCount: 0,
    managerApprovedCount: 0,
    approvedCount: 0,
    reimbursedCount: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Rejection Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Reimbursement Settlement Modal State
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleExpense, setSettleExpense] = useState<Expense | null>(null);
  const [payoutForm, setPayoutForm] = useState({
    method: "payroll" as "payroll" | "direct_transfer",
    paymentReference: "",
    paymentMode: "NEFT / Bank Transfer",
  });

  // New Category Dialog
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: "",
    code: "",
    monthlyCap: "10000",
    requiresReceipt: true,
    description: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, statsRes, catRes] = await Promise.all([
        fetch("/api/hrm/v2/expenses"),
        fetch("/api/hrm/v2/expenses?stats=true"),
        fetch("/api/hrm/v2/expenses/categories"),
      ]);

      const expData = await expRes.json();
      const statsData = await statsRes.json();
      const catData = await catRes.json();

      if (expData.success && Array.isArray(expData.data)) {
        setExpenses(expData.data);
      }
      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }
      if (catData.success && Array.isArray(catData.data)) {
        setCategories(catData.data);
      }
    } catch (err) {
      console.error("Failed to fetch HR expenses:", err);
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
      const res = await fetch("/api/hrm/v2/expenses", {
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
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectId,
          action: "reject",
          rejectionReason: rejectReason.trim(),
        }),
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

  const openSettleModal = (exp: Expense) => {
    setSettleExpense(exp);
    setPayoutForm({
      method: "payroll",
      paymentReference: "",
      paymentMode: "NEFT / Bank Transfer",
    });
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleExpense) return;

    try {
      setActionLoading(true);
      const payload: any = {
        id: settleExpense.id,
        action: "reimburse",
        payoutMethod: payoutForm.method,
      };

      if (payoutForm.method === "payroll") {
        payload.payrollRunId = `PR-${new Date().toISOString().slice(0, 7)}`;
      } else {
        payload.paymentReference = payoutForm.paymentReference.trim() || `TXN-${Date.now().toString().slice(-6)}`;
        payload.paymentMode = payoutForm.paymentMode;
      }

      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSettleModalOpen(false);
        setSettleExpense(null);
        await fetchData();
      }
    } catch (err) {
      console.error("Reimburse error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name || !catForm.code) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catForm.name,
          code: catForm.code,
          monthlyCap: Number(catForm.monthlyCap),
          requiresReceipt: catForm.requiresReceipt,
          description: catForm.description,
        }),
      });

      if (res.ok) {
        setCatModalOpen(false);
        setCatForm({ name: "", code: "", monthlyCap: "10000", requiresReceipt: true, description: "" });
        await fetchData();
      }
    } catch (err) {
      console.error("Category creation error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export Function
  const exportToCSV = () => {
    const headers = [
      "Claim ID",
      "Employee Name",
      "Email",
      "Department",
      "Category",
      "Amount",
      "Currency",
      "Date",
      "Merchant",
      "Status",
      "Manager Approver",
      "HR Approver",
      "Payout Method",
      "Payment Ref",
    ];

    const rows = filteredExpenses.map((e) => [
      `"${e.id}"`,
      `"${e.employeeName || ""}"`,
      `"${e.employeeEmail || ""}"`,
      `"${e.department || "General"}"`,
      `"${e.category}"`,
      e.amount,
      `"${e.currency || "INR"}"`,
      `"${e.expenseDate}"`,
      `"${(e.merchant || "").replace(/"/g, '""')}"`,
      `"${e.status}"`,
      `"${e.managerApprovedByName || ""}"`,
      `"${e.approvedByName || ""}"`,
      `"${e.payoutMethod || ""}"`,
      `"${e.paymentReference || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredExpenses = expenses.filter((e) => {
    let matchesStatus = true;
    if (statusFilter === "needs_review") {
      matchesStatus = e.status === "pending" || e.status === "pending_manager";
    } else if (statusFilter === "manager_approved") {
      matchesStatus = e.status === "manager_approved";
    } else if (statusFilter !== "all") {
      matchesStatus = e.status === statusFilter;
    }

    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchesSearch =
      !search ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: Expense["status"]) => {
    switch (status) {
      case "pending":
      case "pending_manager":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
            Pending Manager
          </Badge>
        );
      case "manager_approved":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
            Manager Approved (Ready)
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            Approved (Queued)
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

  // Compute departmental breakdown for analytics tab
  const departmentBreakdown = expenses.reduce((acc: Record<string, { total: number; count: number }>, e) => {
    const dept = e.department || "General";
    if (!acc[dept]) acc[dept] = { total: 0, count: 0 };
    acc[dept].total += Number(e.amount || 0);
    acc[dept].count += 1;
    return acc;
  }, {});

  const categoryBreakdown = expenses.reduce((acc: Record<string, { total: number; count: number }>, e) => {
    const cat = e.category || "Other";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += Number(e.amount || 0);
    acc[cat].count += 1;
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Expense Approvals & Policy Desk"
          subtitle="Audit employee reimbursement claims, enforce monthly category caps, and execute hybrid payroll / direct settlements"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === "claims" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("claims")}
                className="gap-2 text-xs"
              >
                <FileText className="h-4 w-4" /> Claims Queue
              </Button>
              <Button
                variant={activeTab === "analytics" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("analytics")}
                className="gap-2 text-xs"
              >
                <Building2 className="h-4 w-4" /> Spend Insights
              </Button>
              <Button
                variant={activeTab === "categories" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("categories")}
                className="gap-2 text-xs"
              >
                <Settings2 className="h-4 w-4" /> Policy &amp; Caps
              </Button>
            </div>
          }
        />

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Ready for HR Approval</p>
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
                <p className="text-xs text-muted-foreground font-medium">Queued for Payout</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalApproved || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Settled / Paid</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalReimbursed || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Pending Manager Step</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  {stats.pendingManagerCount || 0} claims
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeTab === "claims" && (
          <>
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employee, merchant, dept..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-border/80 bg-background text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id || c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Button
                  variant={statusFilter === "manager_approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("manager_approved")}
                  className="text-xs font-medium"
                >
                  Ready for HR ({stats.managerApprovedCount || 0})
                </Button>
                <Button
                  variant={statusFilter === "needs_review" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("needs_review")}
                  className="text-xs font-medium"
                >
                  Pending Manager ({stats.pendingManagerCount || 0})
                </Button>
                <Button
                  variant={statusFilter === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("approved")}
                  className="text-xs font-medium"
                >
                  Queued Payout
                </Button>
                <Button
                  variant={statusFilter === "reimbursed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("reimbursed")}
                  className="text-xs font-medium"
                >
                  Reimbursed
                </Button>
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="text-xs font-medium"
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="text-xs gap-1.5 ml-2 border-border/80"
                  title="Export filtered claims to CSV"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>

            {/* Claims Table */}
            <Card className="border border-border/70 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/40 border-b border-border/70 text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Expense Details</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Receipt</th>
                      <th className="py-3 px-4">Workflow Status</th>
                      <th className="py-3 px-4 text-right">HR Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          Loading claims...
                        </td>
                      </tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <p className="font-medium text-muted-foreground text-xs">No expense claims match current filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground text-xs">{exp.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground">{exp.department || "General"}</p>
                            {exp.managerName && (
                              <p className="text-[10px] text-muted-foreground/75 mt-0.5">Mgr: {exp.managerName}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground text-xs">{exp.category}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {exp.merchant ? `Merchant: ${exp.merchant}` : exp.description || "N/A"}
                            </p>
                            {exp.rejectionReason && (
                              <p className="text-[11px] text-destructive mt-1 font-medium">Rejected: {exp.rejectionReason}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs font-medium">
                            {exp.expenseDate}
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
                                <ExternalLink className="h-3 w-3" /> View
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(exp.status)}
                            {exp.payoutMethod && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                                Via {exp.payoutMethod.replace("_", " ")}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {exp.status === "manager_approved" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprove(exp.id)}
                                  disabled={actionLoading}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectId(exp.id)}
                                  disabled={actionLoading}
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}

                            {(exp.status === "pending" || exp.status === "pending_manager") && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(exp.id)}
                                  disabled={actionLoading}
                                  className="h-7 text-xs text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                                  title="Approve directly (HR Override for manager absence)"
                                >
                                  HR Override
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectId(exp.id)}
                                  disabled={actionLoading}
                                  className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}

                            {exp.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openSettleModal(exp)}
                                disabled={actionLoading}
                                className="h-7 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 border-sky-500/30"
                              >
                                Settle Payout
                              </Button>
                            )}

                            {exp.status === "reimbursed" && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Settled</span>
                            )}

                            {exp.status === "rejected" && (
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
          </>
        )}

        {/* Spend Insights Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department Spend Card */}
              <Card className="border border-border/70 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" /> Spend by Department
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">Cumulative</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(departmentBreakdown).map(([dept, data]) => {
                    const totalSpend = Number(stats.totalClaimed || 1);
                    const pct = Math.min(100, Math.round((data.total / (totalSpend || 1)) * 100));
                    return (
                      <div key={dept} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground">{dept} ({data.count} claims)</span>
                          <span className="font-bold text-foreground">₹{data.total.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Category Spend Card */}
              <Card className="border border-border/70 shadow-xs p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-sky-500" /> Spend by Expense Category
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">Total volume</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(categoryBreakdown).map(([cat, data]) => {
                    const totalSpend = Number(stats.totalClaimed || 1);
                    const pct = Math.min(100, Math.round((data.total / (totalSpend || 1)) * 100));
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground">{cat} ({data.count} claims)</span>
                          <span className="font-bold text-foreground">₹{data.total.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Categories Management Tab */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Expense Policy &amp; Monthly Spending Caps</h3>
                <p className="text-xs text-muted-foreground">Configure allowed reimbursement categories, receipt validation rules, and monthly budget limits.</p>
              </div>
              <Button onClick={() => setCatModalOpen(true)} size="sm" className="gap-2 text-xs">
                <Plus className="h-4 w-4" /> Add Category
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Card key={cat.id || cat.code} className="border border-border/70 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-foreground text-sm">{cat.name}</h4>
                      <Badge variant="outline" className="text-[11px] font-mono">{cat.code}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cat.description || "General category reimbursement."}
                    </p>
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Monthly Cap:</span>
                      <span className="font-bold text-foreground">
                        {cat.monthlyCap > 0 ? `₹${cat.monthlyCap.toLocaleString()}` : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Receipt Policy:</span>
                      <span className="font-medium text-foreground">
                        {cat.requiresReceipt ? "Receipt Mandatory" : "Optional"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reimbursement Settlement Modal */}
        <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Disburse &amp; Settle Reimbursement</DialogTitle>
              <DialogDescription>
                Choose whether to include this ₹{Number(settleExpense?.amount || 0).toLocaleString()} claim in the next monthly payroll run or execute an immediate direct bank payout.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmSettle} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Settlement Channel *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutForm({ ...payoutForm, method: "payroll" })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      payoutForm.method === "payroll"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <DollarSign className="h-4 w-4 mb-1" />
                    <p className="text-xs">Next Monthly Payroll</p>
                    <p className="text-[10px] font-normal opacity-80">Added to employee payslip</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayoutForm({ ...payoutForm, method: "direct_transfer" })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      payoutForm.method === "direct_transfer"
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/80 bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mb-1" />
                    <p className="text-xs">Direct Transfer</p>
                    <p className="text-[10px] font-normal opacity-80">Bank UTR / Cash voucher</p>
                  </button>
                </div>
              </div>

              {payoutForm.method === "direct_transfer" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Transaction / UTR Reference *</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR294810398 or CHQ-00124"
                      value={payoutForm.paymentReference}
                      onChange={(e) => setPayoutForm({ ...payoutForm, paymentReference: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Payment Mode</label>
                    <select
                      value={payoutForm.paymentMode}
                      onChange={(e) => setPayoutForm({ ...payoutForm, paymentMode: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="NEFT / Bank Transfer">NEFT / Bank Transfer</option>
                      <option value="IMPS Instant">IMPS Instant</option>
                      <option value="UPI">UPI</option>
                      <option value="Company Cheque">Company Cheque</option>
                      <option value="Petty Cash">Petty Cash</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSettleModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Confirm Settlement"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Rejection Modal */}
        <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Reject Expense Claim</DialogTitle>
              <DialogDescription>
                Provide an audit reason explaining why this reimbursement claim was rejected.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <label className="text-xs font-semibold text-foreground">Rejection Reason *</label>
              <textarea
                rows={3}
                placeholder="e.g. Receipt is missing date or itemized tax breakdown / Exceeds monthly policy limit"
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

        {/* Add Category Modal */}
        <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Add Expense Category</DialogTitle>
              <DialogDescription>
                Create a new business expense category with spending limits.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddCategory} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Relocation & Moving"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category Code *</label>
                <input
                  type="text"
                  placeholder="e.g. RELOCATION"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Monthly Spending Cap (₹)</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={catForm.monthlyCap}
                  onChange={(e) => setCatForm({ ...catForm, monthlyCap: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="What expenses belong in this category?"
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCatModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={actionLoading}>
                  Save Category
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
