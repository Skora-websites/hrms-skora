"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Trash2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  merchant?: string;
  description?: string;
  receiptUrl?: string;
  receiptName?: string;
  status: "pending" | "approved" | "rejected" | "reimbursed";
  rejectionReason?: string;
  reimbursedAt?: string;
  createdAt: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  monthlyCap: number;
  requiresReceipt: boolean;
}

export default function EmployeeExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalClaimed: 0,
    totalApproved: 0,
    totalPending: 0,
    totalReimbursed: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    merchant: "",
    description: "",
    receiptUrl: "",
    receiptName: "",
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
        if (catData.data.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: catData.data[0].name }));
        }
      }
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.category) {
      setFormError("Please select an expense category");
      return;
    }
    const num = Number(formData.amount);
    if (isNaN(num) || num <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }
    if (!formData.expenseDate) {
      setFormError("Please select the expense date");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formData.category,
          amount: num,
          expenseDate: formData.expenseDate,
          merchant: formData.merchant,
          description: formData.description,
          receiptUrl: formData.receiptUrl,
          receiptName: formData.receiptName || (formData.receiptUrl ? "Receipt" : undefined),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit expense claim");
      }

      setIsModalOpen(false);
      setFormData({
        category: categories[0]?.name || "",
        amount: "",
        expenseDate: new Date().toISOString().slice(0, 10),
        merchant: "",
        description: "",
        receiptUrl: "",
        receiptName: "",
      });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pending expense claim?")) return;
    try {
      const res = await fetch(`/api/hrm/v2/expenses?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        fetchData();
      }
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesSearch =
      !search ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: Expense["status"]) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "reimbursed":
        return <Badge variant="info">Reimbursed</Badge>;
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
          title="Expense Claims & Reimbursements"
          subtitle="Submit business expenditures, audit invoices, and track payroll reimbursement cycles"
          action={
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" /> New Claim
            </Button>
          }
        />

        {/* Overview Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Total Claimed</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalClaimed || 0).toLocaleString()}
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
                <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalPending || 0).toLocaleString()}
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
                <p className="text-xs text-muted-foreground font-medium">Approved Claims</p>
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
                <p className="text-xs text-muted-foreground font-medium">Reimbursed</p>
                <p className="text-xl font-bold tracking-tight text-foreground truncate">
                  ₹{Number(stats.totalReimbursed || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/70 shadow-xs">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search category, merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
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

        {/* Expense Claims Table */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Expense Details</th>
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
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      Loading claims...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
                        <FileText className="h-8 w-8 stroke-1 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">No expense claims found</p>
                        <p className="text-xs">Click "New Claim" above to submit an expense for approval.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-foreground text-sm">{exp.category}</p>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{exp.description}</p>
                        )}
                        {exp.status === "rejected" && exp.rejectionReason && (
                          <p className="text-xs text-destructive mt-1 font-medium">
                            Reason: {exp.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-xs font-medium">
                        {exp.expenseDate}
                      </td>
                      <td className="py-3.5 px-4 text-foreground font-medium text-xs">
                        {exp.merchant || "—"}
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
                          <span className="text-xs text-muted-foreground/60">No receipt</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(exp.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        {exp.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(exp.id)}
                            className="text-destructive hover:bg-destructive/10"
                            title="Delete Draft/Pending Claim"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Submit Claim Dialog */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Submit New Expense Claim</DialogTitle>
              <DialogDescription>
                Provide the invoice details, category, and attached receipt for company reimbursement.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Expense Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id || cat.code} value={cat.name}>
                      {cat.name} {cat.monthlyCap > 0 ? `(Monthly Cap: ₹${cat.monthlyCap.toLocaleString()})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Expense Date *</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Merchant / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. Uber, Amazon, Airline, Office Supplies"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Receipt URL or Attachment Link</label>
                <input
                  type="url"
                  placeholder="https://... receipt document URL"
                  value={formData.receiptUrl}
                  onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Business Purpose / Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Explain why this expense was incurred..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
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
