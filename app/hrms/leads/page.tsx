"use client";

import { useState } from "react";
import { Plus, Filter, Download, User, Building2, DollarSign, Target, Tag, Mail, Pencil, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SummaryCards } from "@/components/shared/summary-cards";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useLeads } from "@/hooks/use-api-data";
import { useMutation } from "@/hooks/use-mutation";
import { LEAD_STATUS_OPTIONS } from "@/lib/constants";
import { formatCurrency, getRelativeTime } from "@/lib/utils";
import type { Lead } from "@/types";

const columns = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    cell: (lead: Lead) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-white text-xs font-bold">
          {lead.name.split(" ").map((n: string) => n[0]).join("")}
        </div>
        <div>
          <p className="font-semibold text-sm">{lead.name}</p>
          <p className="text-xs text-muted">{lead.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "company",
    header: "Company",
    sortable: true,
    cell: (lead: Lead) => <span className="text-sm">{lead.company}</span>,
    hideOnMobile: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    cell: (lead: Lead) => {
      const statusConfig = LEAD_STATUS_OPTIONS.find(
        (s) => s.value === lead.status
      );
      const color = statusConfig?.color || "info";
      // Map status color to badge variant (no "subtle-primary" variant exists)
      const badgeVariant =
        color === "primary" ? "subtle" : (`subtle-${color}` as "subtle-info" | "subtle-success" | "subtle-warning" | "subtle-danger");
      return (
        <Badge variant={badgeVariant} size="sm">
          {statusConfig?.label || lead.status}
        </Badge>
      );
    },
  },
  {
    key: "value",
    header: "Value",
    sortable: true,
    cell: (lead: Lead) => (
      <span className="font-semibold">{formatCurrency(lead.value ?? 0)}</span>
    ),
    hideOnTablet: true,
  },
  {
    key: "probability",
    header: "Probability",
    sortable: true,
    cell: (lead: Lead) => (
      <div className="flex items-center gap-2 min-w-[100px]">
        <Progress
          value={lead.probability ?? 0}
          className="h-1.5 flex-1"
          indicatorClassName={
            (lead.probability ?? 0) >= 70
              ? "bg-gradient-success"
              : (lead.probability ?? 0) >= 40
              ? "bg-gradient-warning"
              : "bg-gradient-info"
          }
        />
        <span className="text-xs text-muted w-8">{(lead.probability ?? 0)}%</span>
      </div>
    ),
    hideOnMobile: true,
  },
  {
    key: "owner",
    header: "Owner",
    cell: (lead: Lead) => <span className="text-sm text-muted">{lead.owner || "—"}</span>,
    hideOnTablet: true,
  },
  {
    key: "createdAt",
    header: "Created",
    sortable: true,
    cell: (lead: Lead) => (
      <span className="text-xs text-muted">
        {getRelativeTime(lead.createdAt)}
      </span>
    ),
    hideOnMobile: true,
  },
];

const emptyForm = {
  name: "", company: "", email: "", phone: "", source: "", status: "new", value: "", probability: "50", notes: ""
};

export default function LeadsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const { data: leads, loading, error, refresh } = useLeads();
  const mutation = useMutation();

  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter((l) => l.status === "new").length || 0;
  const qualifiedLeads = leads?.filter((l) => l.status === "qualified").length || 0;
  const wonLeads = leads?.filter((l) => l.status === "won").length || 0;

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/leads", {
      ...form,
      value: form.value ? parseFloat(form.value) : undefined,
      probability: form.probability ? parseInt(form.probability) : 50,
    });
    if (result) { setShowAddDialog(false); setForm(emptyForm); refresh(); }
  };

  const handleEdit = async () => {
    if (!selectedLead) return;
    const result = await mutation.updateRecord(`/api/leads?id=${selectedLead.id}`, {
      ...form,
      value: form.value ? parseFloat(form.value) : undefined,
      probability: form.probability ? parseInt(form.probability) : 50,
    });
    if (result) { setShowEditDialog(false); setSelectedLead(null); setForm(emptyForm); refresh(); }
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    const result = await mutation.deleteRecord(`/api/leads?id=${selectedLead.id}`);
    if (result) { setShowDeleteDialog(false); setSelectedLead(null); refresh(); }
  };

  const openEdit = (lead: any) => {
    setSelectedLead(lead);
    setForm({
      name: lead.name || "",
      company: lead.company || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "",
      status: lead.status || "new",
      value: lead.value?.toString() || "",
      probability: lead.probability?.toString() || "50",
      notes: lead.notes || "",
    });
    setShowEditDialog(true);
  };

  return (
    <AppShell title="Leads">
      <PageHeader
        title="Leads"
        description="Manage and track your sales leads"
      >
        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <Button size="sm" onClick={() => { setForm(emptyForm); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </PageHeader>

      <SummaryCards
        cards={[
          { label: "Total Leads", value: totalLeads },
          { label: "New", value: newLeads, colorClass: "text-info" },
          { label: "Qualified", value: qualifiedLeads, colorClass: "text-primary" },
          { label: "Won", value: wonLeads, colorClass: "text-success" },
        ]}
        loading={loading}
      />

      {error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Download}
              title="Failed to load leads"
              description={error}
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={leads || []}
          searchKeys={["name", "company", "email", "owner"]}
          pageSize={10}
          emptyMessage={loading ? "Loading..." : "No leads found yet"}
        />
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-md">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Add Lead</DialogTitle>
                <DialogDescription>Create a new sales lead.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormSection title="Contact Information" icon={<User className="h-4 w-4" />} columns={2} gradient>
                <FormInput label="Full Name" icon={<User className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" required />
                <FormInput label="Email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" />
                <FormInput label="Phone" icon={<Mail className="h-4 w-4" />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-0000" />
                <FormInput label="Company" icon={<Building2 className="h-4 w-4" />} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
              </FormSection>
              <FormSection title="Lead Details" icon={<Target className="h-4 w-4" />} columns={2}>
                <FormSelect label="Status" icon={<Tag className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={LEAD_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))} />
                <FormInput label="Source" icon={<Target className="h-4 w-4" />} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Website" />
                <FormInput label="Value ($)" type="number" icon={<DollarSign className="h-4 w-4" />} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="10000" />
                <FormInput label="Probability (%)" type="number" icon={<Target className="h-4 w-4" />} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} min="0" max="100" placeholder="50" />
              </FormSection>
              <FormSection title="Notes" columns={1}>
                <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
              </FormSection>
            </div>
            <FormActions onCancel={() => setShowAddDialog(false)} submitLabel="Create Lead" submitIcon={<Plus className="h-4 w-4" />} loading={mutation.loading} error={mutation.error} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-md">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Lead</DialogTitle>
                <DialogDescription>Update lead information.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormSection title="Contact Information" icon={<User className="h-4 w-4" />} columns={2}>
                <FormInput label="Full Name" icon={<User className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <FormInput label="Email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <FormInput label="Phone" icon={<Mail className="h-4 w-4" />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <FormInput label="Company" icon={<Building2 className="h-4 w-4" />} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </FormSection>
              <FormSection title="Lead Details" icon={<Target className="h-4 w-4" />} columns={2}>
                <FormSelect label="Status" icon={<Tag className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={LEAD_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))} />
                <FormInput label="Source" icon={<Target className="h-4 w-4" />} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                <FormInput label="Value ($)" type="number" icon={<DollarSign className="h-4 w-4" />} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                <FormInput label="Probability (%)" type="number" icon={<Target className="h-4 w-4" />} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
              </FormSection>
            </div>
            <FormActions onCancel={() => setShowEditDialog(false)} submitLabel="Save Changes" submitIcon={<Check className="h-4 w-4" />} loading={mutation.loading} error={mutation.error} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-danger text-white shadow-md">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete Lead</DialogTitle>
                <DialogDescription>Are you sure you want to delete <strong>{selectedLead?.name || "this lead"}</strong>? This cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <FormActions onCancel={() => setShowDeleteDialog(false)} submitLabel="Delete" submitIcon={<Trash2 className="h-4 w-4" />} submitVariant="danger" loading={mutation.loading} error={mutation.error} sticky={false} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

