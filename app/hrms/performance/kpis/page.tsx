"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormActions } from "@/components/ui/form-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

// ── Types ───────────────────────────────────────────────

interface KpiItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  target: number;
  actual: number;
  unit: string;
  weight: number;
  period: string;
  status: "on_track" | "behind" | "achieved" | "not_met";
}

interface UserOption {
  id: string;
  displayName?: string;
  email?: string;
}

const categoryColors: Record<string, string> = {
  productivity: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  quality: "bg-success/10 text-success border-success/20",
  attendance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  sales: "bg-primary/10 text-primary border-primary/20",
  customer_satisfaction: "bg-danger/10 text-danger border-danger/20",
  other: "bg-gray-100 dark:bg-gray-800 text-muted border-gray-200 dark:border-gray-700",
};

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  on_track: "primary",
  behind: "warning",
  achieved: "success",
  not_met: "danger",
};

const statusIcons: Record<string, React.ReactNode> = {
  on_track: <TrendingUp className="h-3.5 w-3.5" />,
  behind: <TrendingDown className="h-3.5 w-3.5" />,
  achieved: <CheckCircle2 className="h-3.5 w-3.5" />,
  not_met: <AlertCircle className="h-3.5 w-3.5" />,
};

function formatValue(value: number, unit: string): string {
  if (unit === "$") return `$${value.toLocaleString()}`;
  if (unit === "%") return `${value}%`;
  if (unit === "hours") return `${value}h`;
  if (unit === "score") return value.toFixed(1);
  return `${value}`;
}

const EMPTY_KPI_FORM = {
  name: "",
  userId: "",
  category: "productivity",
  target: 100,
  actual: 0,
  unit: "%",
  weight: 20,
  period: "Q1 2026",
};

export default function KpisPage() {
  const [search, setSearch] = useState("");
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [kpiForm, setKpiForm] = useState(EMPTY_KPI_FORM);

  const [selectedKpi, setSelectedKpi] = useState<KpiItem | null>(null);
  const [editActual, setEditActual] = useState(0);
  const [editStatus, setEditStatus] = useState<KpiItem["status"]>("on_track");

  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=kpis"),
        fetch("/api/hrm/v2/users?action=list"),
      ]);
      const kpisData = kpisRes.ok ? await kpisRes.json() : { data: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
      const users = (usersData.data || []) as UserOption[];
      setKpis(kpisData.data || []);
      setUserOptions(users);
      setUserNames(
        Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id]))
      );
    } catch {
      setKpis([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nameOf = (id: string) => userNames[id] || id || "—";

  const handleAddKpi = async () => {
    if (!kpiForm.name.trim() || !kpiForm.userId) {
      toast.error("Validation error", "Please enter a KPI title and select an employee.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_kpi",
          title: kpiForm.name,
          name: kpiForm.name,
          userId: kpiForm.userId,
          category: kpiForm.category,
          target: Number(kpiForm.target),
          actual: Number(kpiForm.actual),
          unit: kpiForm.unit,
          weight: Number(kpiForm.weight),
          period: kpiForm.period,
          status: "on_track",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create KPI");
      }

      toast.success("KPI Created", "Key Performance Indicator tracked successfully.");
      setShowAddDialog(false);
      setKpiForm(EMPTY_KPI_FORM);
      fetchData();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to create KPI");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (kpi: KpiItem) => {
    setSelectedKpi(kpi);
    setEditActual(kpi.actual || 0);
    setEditStatus(kpi.status || "on_track");
  };

  const handleUpdateKpi = async () => {
    if (!selectedKpi) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hrm/v2/performance?id=${selectedKpi.id}&type=kpi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual: Number(editActual),
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update KPI");
      }

      toast.success("KPI Updated", "Metric updated successfully.");
      setSelectedKpi(null);
      fetchData();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to update KPI");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = kpis.filter((k) => {
    const q = search.toLowerCase();
    const title = (k.name || (k as any).title || "").toLowerCase();
    return !search || title.includes(q) || nameOf(k.userId).toLowerCase().includes(q) || (k.category || "").toLowerCase().includes(q);
  });

  return (
    <AppShell title="KPIs">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              description={t.description}
              onClose={() => toast.dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="KPI Tracking"
        description="Monitor key performance indicators and metrics across the organization."
      >
        <Button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add KPI
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search KPIs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted">Loading KPIs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg">No KPIs found</p>
          <p className="text-sm text-muted mt-1">Track key metrics by clicking "Add KPI".</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((kpi, idx) => {
            const displayName = kpi.name || (kpi as any).title || "KPI Metric";
            const progress = kpi.target > 0 ? Math.min(Math.round((kpi.actual / kpi.target) * 100), 100) : 0;
            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{displayName}</h3>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users className="h-3 w-3" />{nameOf(kpi.userId)}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${categoryColors[kpi.category] || categoryColors.other}`}>
                          {(kpi.category || "General").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Target className="h-3 w-3" />Target: {formatValue(kpi.target, kpi.unit)}
                        </span>
                        {kpi.period && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock className="h-3 w-3" />{kpi.period}
                          </span>
                        )}
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              progress >= 100 ? "bg-success" :
                              progress >= 70 ? "bg-primary" :
                              progress >= 40 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          {formatValue(kpi.actual, kpi.unit)}
                          <span className="text-muted font-normal"> / {formatValue(kpi.target, kpi.unit)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted font-medium">Weight: {kpi.weight}%</span>
                    <Badge variant={statusColors[kpi.status] || "info"} size="sm">
                      <span className="flex items-center gap-1">
                        {statusIcons[kpi.status]}
                        {(kpi.status || "on_track").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(kpi)}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Update
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add KPI Modal */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Key Performance Indicator</DialogTitle>
            <DialogDescription>Define a measurable target for an employee or team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddKpi(); }}>
            <div className="space-y-4">
              <FormInput
                label="KPI Name"
                placeholder="e.g. Code Review Velocity"
                value={kpiForm.name}
                onChange={(e) => setKpiForm({ ...kpiForm, name: e.target.value })}
                required
              />
              <FormSelect
                label="Assignee"
                options={[
                  { value: "", label: "Select employee" },
                  ...userOptions.map((u) => ({ value: u.id, label: u.displayName || u.email || u.id })),
                ]}
                value={kpiForm.userId}
                onChange={(e) => setKpiForm({ ...kpiForm, userId: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Category"
                  options={[
                    { value: "productivity", label: "Productivity" },
                    { value: "quality", label: "Quality" },
                    { value: "attendance", label: "Attendance" },
                    { value: "sales", label: "Sales" },
                    { value: "customer_satisfaction", label: "Satisfaction" },
                    { value: "other", label: "Other" },
                  ]}
                  value={kpiForm.category}
                  onChange={(e) => setKpiForm({ ...kpiForm, category: e.target.value })}
                />
                <FormSelect
                  label="Unit"
                  options={[
                    { value: "%", label: "% (Percent)" },
                    { value: "$", label: "$ (Currency)" },
                    { value: "hours", label: "Hours" },
                    { value: "score", label: "Score (1-5)" },
                    { value: "units", label: "Units / Count" },
                  ]}
                  value={kpiForm.unit}
                  onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormInput
                  label="Target"
                  type="number"
                  step="any"
                  value={kpiForm.target}
                  onChange={(e) => setKpiForm({ ...kpiForm, target: Number(e.target.value) })}
                  required
                />
                <FormInput
                  label="Initial Actual"
                  type="number"
                  step="any"
                  value={kpiForm.actual}
                  onChange={(e) => setKpiForm({ ...kpiForm, actual: Number(e.target.value) })}
                />
                <FormInput
                  label="Weight (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={kpiForm.weight}
                  onChange={(e) => setKpiForm({ ...kpiForm, weight: Number(e.target.value) })}
                />
              </div>
              <FormInput
                label="Evaluation Period"
                placeholder="e.g. Q1 2026 or March 2026"
                value={kpiForm.period}
                onChange={(e) => setKpiForm({ ...kpiForm, period: e.target.value })}
              />

              <FormActions
                onCancel={() => setShowAddDialog(false)}
                submitLabel="Add KPI"
                loading={submitting}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Actual Dialog */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update KPI Progress</DialogTitle>
            <DialogDescription>
              {selectedKpi?.name} ({nameOf(selectedKpi?.userId || "")})
            </DialogDescription>
          </DialogHeader>
          {selectedKpi && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateKpi(); }}>
              <div className="space-y-4">
                <FormInput
                  label={`Actual Value (${selectedKpi.unit})`}
                  type="number"
                  step="any"
                  value={editActual}
                  onChange={(e) => setEditActual(Number(e.target.value))}
                  required
                />
                <FormSelect
                  label="Status"
                  options={[
                    { value: "on_track", label: "On Track" },
                    { value: "behind", label: "Behind" },
                    { value: "achieved", label: "Achieved" },
                    { value: "not_met", label: "Not Met" },
                  ]}
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                />
                <FormActions
                  onCancel={() => setSelectedKpi(null)}
                  submitLabel="Update Metric"
                  loading={submitting}
                />
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
