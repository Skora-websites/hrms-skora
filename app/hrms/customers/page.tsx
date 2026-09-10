"use client";

import { useState } from "react";
import { Plus, Filter, Download, User, Building2, DollarSign, Mail, Phone, Globe, Pencil, Trash2, Check } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { useCustomers } from "@/hooks/use-api-data";
import { useMutation } from "@/hooks/use-mutation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Customer } from "@/types";

const columns = [
  {
    key: "name",
    header: "Customer",
    sortable: true,
    cell: (customer: Customer) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-success text-white text-xs font-bold">
          {customer.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
        <div>
          <p className="font-semibold text-sm">{customer.name}</p>
          <p className="text-xs text-muted">{customer.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: "company",
    header: "Company",
    sortable: true,
    cell: (customer: Customer) => <span className="text-sm">{customer.company}</span>,
    hideOnMobile: true,
  },
  {
    key: "industry",
    header: "Industry",
    cell: (customer: Customer) => (
      <Badge variant="subtle" size="sm">
        {customer.industry}
      </Badge>
    ),
    hideOnTablet: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    cell: (customer: Customer) => (
      <Badge
        variant={
          customer.status === "vip"
            ? "subtle-warning"
            : customer.status === "active"
            ? "subtle-success"
            : "subtle-danger"
        }
        size="sm"
      >
        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
      </Badge>
    ),
  },
  {
    key: "lifetimeValue",
    header: "LTV",
    sortable: true,
    cell: (customer: Customer) => (
      <span className="font-semibold">
        {formatCurrency(customer.lifetimeValue ?? 0)}
      </span>
    ),
    hideOnMobile: true,
  },
  {
    key: "deals",
    header: "Deals",
    sortable: true,
    cell: (customer: Customer) => <span className="text-sm">{customer.deals}</span>,
    hideOnTablet: true,
  },
  {
    key: "lastContact",
    header: "Last Contact",
    sortable: true,
    cell: (customer: Customer) => (
      <span className="text-xs text-muted">
        {formatDate(customer.lastContact)}
      </span>
    ),
    hideOnMobile: true,
  },
];

const CUSTOMER_STATUSES = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "vip", label: "VIP" }];
const INDUSTRIES = [{ value: "Technology", label: "Technology" }, { value: "Finance", label: "Finance" }, { value: "Healthcare", label: "Healthcare" }, { value: "Education", label: "Education" }, { value: "Manufacturing", label: "Manufacturing" }, { value: "Retail", label: "Retail" }, { value: "Other", label: "Other" }];

const emptyForm = { name: "", company: "", email: "", phone: "", website: "", industry: "Technology", status: "active", lifetimeValue: "", notes: "" };

export default function CustomersPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const { data: customers, loading, error, refresh } = useCustomers();
  const mutation = useMutation();

  const totalCustomers = customers?.length || 0;
  const activeCount = customers?.filter((c) => c.status === "active").length || 0;
  const vipCount = customers?.filter((c) => c.status === "vip").length || 0;
  const totalLtv = customers?.reduce((sum, c) => sum + (c.lifetimeValue ?? 0), 0) || 0;

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/customers", {
      ...form,
      lifetimeValue: form.lifetimeValue ? parseFloat(form.lifetimeValue) : undefined,
    });
    if (result) { setShowAddDialog(false); setForm(emptyForm); refresh(); }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;
    const result = await mutation.updateRecord(`/api/customers?id=${selectedCustomer.id}`, {
      ...form,
      lifetimeValue: form.lifetimeValue ? parseFloat(form.lifetimeValue) : undefined,
    });
    if (result) { setShowEditDialog(false); setSelectedCustomer(null); setForm(emptyForm); refresh(); }
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    const result = await mutation.deleteRecord(`/api/customers?id=${selectedCustomer.id}`);
    if (result) { setShowDeleteDialog(false); setSelectedCustomer(null); refresh(); }
  };

  const openEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setForm({
      name: customer.name || "",
      company: customer.company || "",
      email: customer.email || "",
      phone: customer.phone || "",
      website: customer.website || "",
      industry: customer.industry || "Technology",
      status: customer.status || "active",
      lifetimeValue: customer.lifetimeValue?.toString() || "",
      notes: customer.notes || "",
    });
    setShowEditDialog(true);
  };

  return (
    <AppShell title="Customers">
      <PageHeader
        title="Customers"
        description="Manage your customer relationships"
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
          Add Customer
        </Button>
      </PageHeader>

      <SummaryCards
        cards={[
          { label: "Total Customers", value: totalCustomers },
          { label: "Active", value: activeCount, colorClass: "text-success" },
          { label: "VIP", value: vipCount, colorClass: "text-warning" },
          { label: "Total LTV", value: formatCurrency(totalLtv), colorClass: "text-primary" },
        ]}
        loading={loading}
      />

      {error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Download}
              title="Failed to load customers"
              description={error}
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={customers || []}
          searchKeys={["name", "company", "email", "industry"]}
          pageSize={10}
          emptyMessage={loading ? "Loading..." : "No customers found yet"}
        />
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-success text-white shadow-md">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Add Customer</DialogTitle>
                <DialogDescription>Create a new customer record.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormSection title="Contact Information" icon={<User className="h-4 w-4" />} columns={2} gradient>
                <FormInput label="Full Name" icon={<User className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" required />
                <FormInput label="Company" icon={<Building2 className="h-4 w-4" />} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
                <FormInput label="Email" type="email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@acme.com" />
                <FormInput label="Phone" icon={<Phone className="h-4 w-4" />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555-1234" />
              </FormSection>
              <FormSection title="Company Details" icon={<Building2 className="h-4 w-4" />} columns={2}>
                <FormInput label="Website" icon={<Globe className="h-4 w-4" />} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://acme.com" />
                <FormSelect label="Industry" icon={<Building2 className="h-4 w-4" />} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} options={INDUSTRIES} />
                <FormSelect label="Status" icon={<User className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={CUSTOMER_STATUSES} />
                <FormInput label="Lifetime Value ($)" type="number" icon={<DollarSign className="h-4 w-4" />} value={form.lifetimeValue} onChange={(e) => setForm({ ...form, lifetimeValue: e.target.value })} placeholder="50000" />
              </FormSection>
              <FormSection title="Notes" columns={1}>
                <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
              </FormSection>
            </div>
            <FormActions onCancel={() => setShowAddDialog(false)} submitLabel="Create Customer" submitIcon={<Plus className="h-4 w-4" />} loading={mutation.loading} error={mutation.error} />
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
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>Update customer information.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormSection title="Contact Information" icon={<User className="h-4 w-4" />} columns={2}>
                <FormInput label="Full Name" icon={<User className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <FormInput label="Company" icon={<Building2 className="h-4 w-4" />} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <FormInput label="Email" type="email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <FormInput label="Phone" icon={<Phone className="h-4 w-4" />} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FormSection>
              <FormSection title="Company Details" icon={<Building2 className="h-4 w-4" />} columns={2}>
                <FormInput label="Website" icon={<Globe className="h-4 w-4" />} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <FormSelect label="Industry" icon={<Building2 className="h-4 w-4" />} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} options={INDUSTRIES} />
                <FormSelect label="Status" icon={<User className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={CUSTOMER_STATUSES} />
                <FormInput label="Lifetime Value ($)" type="number" icon={<DollarSign className="h-4 w-4" />} value={form.lifetimeValue} onChange={(e) => setForm({ ...form, lifetimeValue: e.target.value })} />
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
                <DialogTitle>Delete Customer</DialogTitle>
                <DialogDescription>Are you sure you want to delete <strong>{selectedCustomer?.name || "this customer"}</strong>? This cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <FormActions onCancel={() => setShowDeleteDialog(false)} submitLabel="Delete" submitIcon={<Trash2 className="h-4 w-4" />} submitVariant="danger" loading={mutation.loading} error={mutation.error} sticky={false} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
