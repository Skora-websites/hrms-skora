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
} from "lucide-react";

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
  status: "pending" | "approved" | "rejected" | "reimbursed";
  rejectionReason?: string;
  reimbursedAt?: string;
  approvedByName?: string;
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
  const [activeTab, setActiveTab] = useState<"claims" | "categories">("claims");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalReimbursed: 0,
    pendingCount: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Rejection Dialog State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleReimburse = async (id: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "reimburse", payrollRunId: `PR-${new Date().toISOString().slice(0, 7)}` }),
      });
      if (res.ok) {
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

  const filteredExpenses = expenses.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || e.category === categoryFilter;
    const matchesSearch =
      !search ||
      e.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      e.department?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        <PageHeader
          title="Expense Approvals & Policy Desk"
          subtitle="Audit employee reimbursement claims, verify attached invoices, and configure policy category spending limits"
          action={
            <div className="flex gap-2">
              <Button
                variant={activeTab === "claims" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("claims")}
                className="gap-2 text-xs"
              >
                <FileText className="h-4 w-4" /> Claims Queue
              </Button>
              <Button
                variant={activeTab === "categories" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("categories")}
                className="gap-2 text-xs"
              >
                <Settings2 className="h-4 w-4" /> Policy & Categories
              </Button>
            </div>
          }
        />

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Pending Claims</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  {stats.pendingCount || 0} <span className="text-xs font-normal text-muted-foreground">(₹{Number(stats.totalPending || 0).toLocaleString()})</span>
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
                <p className="text-xs text-muted-foreground font-medium">Approved Total</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalApproved || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Reimbursed</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalReimbursed || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Policy Categories</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  {categories.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {activeTab === "claims" ? (
          <>
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employee, merchant..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                {["all", "pending", "approved", "reimbursed", "rejected"].map((st) => (
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
                      <th className="py-3 px-4">Expense Details</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Receipt</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-muted-foreground">
                          Loading claims...
                        </td>
                      </tr>
                    ) : filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12">
                          <p className="font-medium text-muted-foreground">No expense claims match current filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground text-sm">{exp.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{exp.department || "General"}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-foreground text-sm">{exp.category}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {exp.merchant ? `Merchant: ${exp.merchant}` : exp.description || "—"}
                            </p>
                            {exp.rejectionReason && (
                              <p className="text-xs text-destructive mt-1 font-medium">Rejected: {exp.rejectionReason}</p>
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
                                <ExternalLink className="h-3 w-3" /> View Receipt
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {exp.status === "approved" && <Badge variant="success">Approved</Badge>}
                            {exp.status === "pending" && <Badge variant="warning">Pending</Badge>}
                            {exp.status === "reimbursed" && <Badge variant="info">Reimbursed</Badge>}
                            {exp.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {exp.status === "pending" && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleApprove(exp.id)}
                                  disabled={actionLoading}
                                  className="h-8 text-xs font-medium"
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => setRejectId(exp.id)}
                                  disabled={actionLoading}
                                  className="h-8 text-xs font-medium"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                            {exp.status === "approved" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReimburse(exp.id)}
                                disabled={actionLoading}
                                className="h-8 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10"
                              >
                                Mark Reimbursed
                              </Button>
                            )}
                            {(exp.status === "reimbursed" || exp.status === "rejected") && (
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
        ) : (
          /* Categories Management Tab */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Expense Policy & Monthly Spending Caps</h3>
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
                        {cat.requiresReceipt ? "Receipt Required" : "Optional"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

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
