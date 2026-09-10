"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import type { Column, Action } from "@/components/shared/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormActions } from "@/components/ui/form-actions";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Pencil,
  Trash2,
  Plus,
  CalendarDays,
  ToggleLeft,
  Hash,
} from "lucide-react";
import { useProbationPolicies, useProbationDashboard } from "@/hooks/hrm/use-probation";
import { useMutation } from "@/hooks/use-mutation";

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  active: "success",
  inactive: "info",
};

const REVIEW_FREQ = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "mid_term", label: "Mid Term" },
];

const emptyForm = { name: "", defaultDurationDays: "90", reviewFrequency: "monthly", reviewDates: "", requiresApproval: "true", autoConfirm: "false", autoConfirmDays: "0", status: "active" };

export default function ProbationPage() {
  const { data: policies, loading, error, refetch } = useProbationPolicies();
  const { data: dashboard } = useProbationDashboard();
  const mutation = useMutation();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/probation", {
      name: form.name, defaultDurationDays: parseInt(form.defaultDurationDays),
      reviewFrequency: form.reviewFrequency, reviewDates: form.reviewDates ? form.reviewDates.split(",").map(Number).filter(Boolean) : [],
      requiresApproval: form.requiresApproval === "true", autoConfirm: form.autoConfirm === "true",
      autoConfirmDays: parseInt(form.autoConfirmDays), status: form.status,
    });
    if (result) { setShowAddDialog(false); resetForm(); refetch(); }
  };

  const handleEdit = async () => {
    if (!selectedPolicy) return;
    const result = await mutation.updateRecord(`/api/hrm/v2/probation?id=${selectedPolicy.id}`, {
      name: form.name, defaultDurationDays: parseInt(form.defaultDurationDays),
      reviewFrequency: form.reviewFrequency, reviewDates: form.reviewDates ? form.reviewDates.split(",").map(Number).filter(Boolean) : [],
      requiresApproval: form.requiresApproval === "true", autoConfirm: form.autoConfirm === "true",
      autoConfirmDays: parseInt(form.autoConfirmDays), status: form.status,
    });
    if (result) { setShowEditDialog(false); setSelectedPolicy(null); resetForm(); refetch(); }
  };

  const handleDelete = async () => {
    if (!selectedPolicy) return;
    const result = await mutation.deleteRecord(`/api/hrm/v2/probation?id=${selectedPolicy.id}`);
    if (result) { setShowDeleteDialog(false); setSelectedPolicy(null); refetch(); }
  };

  const openEdit = (policy: any) => {
    setSelectedPolicy(policy);
    setForm({
      name: policy.name || "", defaultDurationDays: String(policy.defaultDurationDays || 90),
      reviewFrequency: policy.reviewFrequency || "monthly", reviewDates: (policy.reviewDates || []).join(","),
      requiresApproval: policy.requiresApproval ? "true" : "false", autoConfirm: policy.autoConfirm ? "true" : "false",
      autoConfirmDays: String(policy.autoConfirmDays || 0), status: policy.status || "active",
    });
    setShowEditDialog(true);
  };

  const safeDashboard = dashboard || { activePolicies: 0, dueReviews: 0, confirmedLastMonth: 0, extendedLastMonth: 0 };

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Policy",
      sortable: true,
      cell: (p: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-warning flex items-center justify-center text-white">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark dark:text-white">{p.name}</p>
            <p className="text-xs text-muted capitalize">{REVIEW_FREQ.find((f) => f.value === p.reviewFrequency)?.label || p.reviewFrequency || "—"} reviews</p>
          </div>
        </div>
      ),
    },
    {
      key: "defaultDurationDays",
      header: "Duration",
      sortable: true,
      cell: (p: any) => <span className="text-sm font-medium">{p.defaultDurationDays || "—"} days</span>,
    },
    {
      key: "reviewFrequency",
      header: "Review Freq",
      cell: (p: any) => (
        <Badge variant="info" size="sm" className="capitalize">
          {REVIEW_FREQ.find((f) => f.value === p.reviewFrequency)?.label || p.reviewFrequency || "—"}
        </Badge>
      ),
    },
    {
      key: "reviewDates",
      header: "Reviews",
      cell: (p: any) => <span className="text-sm text-muted">{p.reviewDates?.length || 0} scheduled</span>,
    },
    {
      key: "autoConfirm",
      header: "Auto-Confirm",
      sortable: true,
      cell: (p: any) => (
        <Badge variant={p.autoConfirm ? "success" : "subtle"} size="sm">{p.autoConfirm ? "Yes" : "No"}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (p: any) => (
        <Badge variant={statusColors[p.status as keyof typeof statusColors] || "info"} size="sm">{p.status}</Badge>
      ),
    },
  ];

  const actions: Action<any>[] = [
    { label: "Edit", icon: Pencil, onClick: (p: any) => openEdit(p), variant: "ghost" },
    { label: "Delete", icon: Trash2, onClick: (p: any) => { setSelectedPolicy(p); setShowDeleteDialog(true); }, variant: "ghost" },
  ];

  return (
    <AppShell title="Probation">
      <PageHeader
        title="Probation Management"
        description="Manage employee probation periods, reviews, and confirmations."
      >
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <UserCheck className="mr-2 h-4 w-4" />
          New Policy
        </Button>
      </PageHeader>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Policies", value: safeDashboard.activePolicies, icon: ClipboardList, color: "text-primary" },
          { label: "Due Reviews", value: safeDashboard.dueReviews, icon: Clock, color: "text-warning" },
          { label: "Confirmed (Month)", value: safeDashboard.confirmedLastMonth, icon: CheckCircle2, color: "text-success" },
          { label: "Extended (Month)", value: safeDashboard.extendedLastMonth, icon: AlertTriangle, color: "text-danger" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={policies ?? []}
        searchable
        searchKeys={["name"]}
        pageSize={10}
        loading={loading}
        error={error || undefined}
        onRetry={refetch}
        emptyMessage="No probation policies yet"
        actions={actions}
        striped
        stickyHeader
      />

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Plus className="h-4 w-4 text-warning" />
              </div>
              New Probation Policy
            </DialogTitle>
            <DialogDescription>Create a new probation policy for employees.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-6">
            <FormSection title="Policy Details" icon={<ClipboardList className="h-4 w-4" />} columns={2}>
              <FormInput label="Policy Name" icon={<UserCheck className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Standard Probation" />
              <FormInput label="Duration (days)" icon={<CalendarDays className="h-4 w-4" />} value={form.defaultDurationDays} onChange={(e) => setForm({ ...form, defaultDurationDays: e.target.value })} type="number" min="1" placeholder="90" required />
              <FormSelect label="Review Frequency" icon={<Clock className="h-4 w-4" />} value={form.reviewFrequency} onChange={(e) => setForm({ ...form, reviewFrequency: e.target.value })} options={REVIEW_FREQ.map((f) => ({ value: f.value, label: f.label }))} />
              <FormInput label="Review Day Numbers" icon={<Hash className="h-4 w-4" />} value={form.reviewDates} onChange={(e) => setForm({ ...form, reviewDates: e.target.value })} placeholder="30, 60, 85" />
              <FormSelect label="Requires Approval" icon={<CheckCircle2 className="h-4 w-4" />} value={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <FormSelect label="Auto-confirm" icon={<ToggleLeft className="h-4 w-4" />} value={form.autoConfirm} onChange={(e) => setForm({ ...form, autoConfirm: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <FormInput label="Auto-confirm Days" icon={<CalendarDays className="h-4 w-4" />} value={form.autoConfirmDays} onChange={(e) => setForm({ ...form, autoConfirmDays: e.target.value })} type="number" min="0" placeholder="0" />
              <FormSelect label="Status" icon={<ToggleLeft className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowAddDialog(false)} submitLabel="Create Policy" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Pencil className="h-4 w-4 text-warning" />
              </div>
              Edit Policy
            </DialogTitle>
            <DialogDescription>Update the probation policy details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-6">
            <FormSection title="Policy Details" icon={<ClipboardList className="h-4 w-4" />} columns={2}>
              <FormInput label="Policy Name" icon={<UserCheck className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Standard Probation" />
              <FormInput label="Duration (days)" icon={<CalendarDays className="h-4 w-4" />} value={form.defaultDurationDays} onChange={(e) => setForm({ ...form, defaultDurationDays: e.target.value })} type="number" min="1" placeholder="90" required />
              <FormSelect label="Review Frequency" icon={<Clock className="h-4 w-4" />} value={form.reviewFrequency} onChange={(e) => setForm({ ...form, reviewFrequency: e.target.value })} options={REVIEW_FREQ.map((f) => ({ value: f.value, label: f.label }))} />
              <FormInput label="Review Day Numbers" icon={<Hash className="h-4 w-4" />} value={form.reviewDates} onChange={(e) => setForm({ ...form, reviewDates: e.target.value })} placeholder="30, 60, 85" />
              <FormSelect label="Requires Approval" icon={<CheckCircle2 className="h-4 w-4" />} value={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <FormSelect label="Auto-confirm" icon={<ToggleLeft className="h-4 w-4" />} value={form.autoConfirm} onChange={(e) => setForm({ ...form, autoConfirm: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <FormInput label="Auto-confirm Days" icon={<CalendarDays className="h-4 w-4" />} value={form.autoConfirmDays} onChange={(e) => setForm({ ...form, autoConfirmDays: e.target.value })} type="number" min="0" placeholder="0" />
              <FormSelect label="Status" icon={<ToggleLeft className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowEditDialog(false)} submitLabel="Save Changes" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Delete Policy
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedPolicy?.name || "this policy"}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20 mb-4">{mutation.error}</div>}
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={mutation.loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}><Trash2 className="h-4 w-4 mr-1.5" />Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
