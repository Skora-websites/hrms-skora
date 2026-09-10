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
  Sun,
  Plus,
  Calendar,
  Globe,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";
import { useHolidays, useHolidayDashboard } from "@/hooks/hrm/use-holidays";
import { useMutation } from "@/hooks/use-mutation";
import { formatDate } from "@/lib/utils";

const emptyForm = { name: "", date: "", type: "fixed", isPaid: "true", planId: "" };

export default function HolidaysPage() {
  const currentYear = new Date().getFullYear();
  const { data: holidays, loading, error, refetch } = useHolidays({ year: String(currentYear) });
  const { data: dashboard } = useHolidayDashboard();
  const mutation = useMutation();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/holidays", {
      name: form.name, date: form.date, type: form.type, isPaid: form.isPaid === "true", planId: form.planId || undefined,
    });
    if (result) { setShowAddDialog(false); resetForm(); refetch(); }
  };

  const handleEdit = async () => {
    if (!selectedHoliday) return;
    const result = await mutation.updateRecord(`/api/hrm/v2/holidays?id=${selectedHoliday.id}`, {
      name: form.name, date: form.date, type: form.type, isPaid: form.isPaid === "true", planId: form.planId || undefined,
    });
    if (result) { setShowEditDialog(false); setSelectedHoliday(null); resetForm(); refetch(); }
  };

  const handleDelete = async () => {
    if (!selectedHoliday) return;
    const result = await mutation.deleteRecord(`/api/hrm/v2/holidays?id=${selectedHoliday.id}`);
    if (result) { setShowDeleteDialog(false); setSelectedHoliday(null); refetch(); }
  };

  const openEdit = (holiday: any) => {
    setSelectedHoliday(holiday);
    setForm({
      name: holiday.name || "",
      date: holiday.date ? new Date(holiday.date).toISOString().split("T")[0] : "",
      type: holiday.type || "fixed",
      isPaid: holiday.isPaid !== false ? "true" : "false",
      planId: holiday.planId || "",
    });
    setShowEditDialog(true);
  };

  const safeDashboard = dashboard || { totalPlans: 0, holidaysThisYear: 0, upcomingHolidays: 0 };

  const columns: Column<any>[] = [
    {
      key: "name",
      header: "Holiday",
      sortable: true,
      cell: (holiday: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-warning/10 flex items-center justify-center">
            <Sun className="h-5 w-5 text-warning" />
          </div>
          <span className="text-sm font-semibold text-dark dark:text-white">{holiday.name}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      cell: (holiday: any) => (
        <span className="text-sm text-muted">{holiday.date ? formatDate(holiday.date as any) : "—"}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (holiday: any) => (
        <Badge variant={holiday.type === "fixed" ? "success" : holiday.type === "optional" ? "warning" : "info"} size="sm" className="capitalize">
          {holiday.type || "fixed"}
        </Badge>
      ),
    },
    {
      key: "isPaid",
      header: "Paid",
      sortable: true,
      cell: (holiday: any) => (
        <Badge variant={holiday.isPaid !== false ? "success" : "danger"} size="sm">
          {holiday.isPaid !== false ? "Yes" : "No"}
        </Badge>
      ),
    },
  ];

  const actions: Action<any>[] = [
    { label: "Edit", icon: Pencil, onClick: (h: any) => openEdit(h), variant: "ghost" },
    { label: "Delete", icon: Trash2, onClick: (h: any) => { setSelectedHoliday(h); setShowDeleteDialog(true); }, variant: "ghost" },
  ];

  return (
    <AppShell title="Holidays">
      <PageHeader
        title="Holidays"
        description="Manage company holidays, regional observances, and holiday plans."
      >
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Holiday
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Holidays", value: safeDashboard.holidaysThisYear, icon: Sun, color: "text-warning" },
          { label: "Upcoming", value: safeDashboard.upcomingHolidays, icon: Calendar, color: "text-primary" },
          { label: "Holiday Plans", value: safeDashboard.totalPlans, icon: Globe, color: "text-info" },
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
        data={holidays ?? []}
        searchable
        searchKeys={["name", "type"]}
        pageSize={10}
        loading={loading}
        error={error || undefined}
        onRetry={refetch}
        emptyMessage={`No holidays found for ${currentYear}`}
        actions={actions}
        striped
        stickyHeader
      />

      {/* Add Holiday Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Sun className="h-4 w-4 text-warning" />
              </div>
              Add Holiday
            </DialogTitle>
            <DialogDescription>Create a new company holiday.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-6">
            <FormSection title="Holiday Details" icon={<Sun className="h-4 w-4" />} columns={2}>
              <FormInput label="Holiday Name" icon={<Sun className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Christmas" />
              <FormInput label="Date" type="date" icon={<Calendar className="h-4 w-4" />} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              <FormSelect label="Type" icon={<Filter className="h-4 w-4" />} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "fixed", label: "Fixed" }, { value: "optional", label: "Optional" }, { value: "floating", label: "Floating" }]} />
              <FormSelect label="Paid Holiday" icon={<Calendar className="h-4 w-4" />} value={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <div className="col-span-full"><FormInput label="Plan ID" icon={<Globe className="h-4 w-4" />} value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} placeholder="plan_123" /></div>
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowAddDialog(false)} submitLabel="Create Holiday" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              Edit Holiday
            </DialogTitle>
            <DialogDescription>Update the holiday details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-6">
            <FormSection title="Holiday Details" icon={<Sun className="h-4 w-4" />} columns={2}>
              <FormInput label="Holiday Name" icon={<Sun className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Christmas" />
              <FormInput label="Date" type="date" icon={<Calendar className="h-4 w-4" />} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              <FormSelect label="Type" icon={<Filter className="h-4 w-4" />} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: "fixed", label: "Fixed" }, { value: "optional", label: "Optional" }, { value: "floating", label: "Floating" }]} />
              <FormSelect label="Paid Holiday" icon={<Calendar className="h-4 w-4" />} value={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.value })} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
              <div className="col-span-full"><FormInput label="Plan ID" icon={<Globe className="h-4 w-4" />} value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} placeholder="plan_123" /></div>
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowEditDialog(false)} submitLabel="Save Changes" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Delete Holiday
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedHoliday?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20 mb-4">{mutation.error}</div>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={mutation.loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete Holiday
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
