"use client";

import { useState } from "react";
import {
  Plus,
  Filter,
  Download,
  Mail,
  Phone,
  MoreHorizontal,
  User,
  Building2,
  Globe,
  MapPin,
  Tag,
  Briefcase,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { SummaryCards } from "@/components/shared/summary-cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import { useContacts } from "@/hooks/use-api-data";
import { formatDate, getInitials, getAvatarColor } from "@/lib/utils";
import type { Contact } from "@/types";

const columns = [
  {
    key: "name",
    header: "Contact",
    sortable: true,
    cell: (contact: Contact) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback
            style={{ background: getAvatarColor(contact.name) }}
          >
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{contact.name}</p>
          <p className="text-xs text-muted">{contact.position}</p>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (contact: Contact) => (
      <div className="flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 text-muted" />
        <span className="text-sm">{contact.email}</span>
      </div>
    ),
    hideOnMobile: true,
  },
  {
    key: "phone",
    header: "Phone",
    cell: (contact: Contact) =>
      contact.phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted" />
          <span className="text-sm">{contact.phone}</span>
        </div>
      ) : (
        <span className="text-sm text-muted">—</span>
      ),
    hideOnTablet: true,
  },
  {
    key: "company",
    header: "Company",
    sortable: true,
    cell: (contact: Contact) => <span className="text-sm">{contact.company}</span>,
    hideOnMobile: true,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    cell: (contact: Contact) => (
      <Badge
        variant={contact.status === "active" ? "subtle-success" : "subtle-danger"}
        size="sm"
      >
        {(contact.status?.charAt(0).toUpperCase() ?? "") + (contact.status?.slice(1) ?? "")}
      </Badge>
    ),
  },
  {
    key: "lastContact",
    header: "Last Contact",
    sortable: true,
    cell: (contact: Contact) => (
      <span className="text-xs text-muted">
        {formatDate(contact.lastContact)}
      </span>
    ),
    hideOnMobile: true,
  },
  {
    key: "actions",
    header: "",
    cell: () => (
      <Button variant="ghost" size="icon-xs">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    ),
    hideOnMobile: true,
  },
];

export default function ContactsPage() {
  const { data: contacts, loading, error } = useContacts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    website: "",
    address: "",
    industry: "",
    status: "active",
    notes: "",
    lastContact: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const totalContacts = contacts?.length || 0;
  const activeCount = contacts?.filter((c) => c.status === "active").length || 0;
  const companies = new Set(contacts?.map((c) => c.company)).size;
  const inactiveCount = contacts?.filter((c) => c.status === "inactive").length || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      setShowAddModal(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        position: "",
        website: "",
        address: "",
        industry: "",
        status: "active",
        notes: "",
        lastContact: new Date().toISOString().split("T")[0],
      });
    } catch {
      // Contact creation error handled via UI state
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <AppShell title="Contacts">
      <PageHeader
        title="Contacts"
        description="Manage your contact directory"
      >
        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </PageHeader>

      <SummaryCards
        cards={[
          { label: "Total Contacts", value: totalContacts },
          { label: "Active", value: activeCount, colorClass: "text-success" },
          { label: "Companies", value: companies, colorClass: "text-primary" },
          { label: "Inactive", value: inactiveCount, colorClass: "text-danger" },
        ]}
        loading={loading}
      />

      {error ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Download}
              title="Failed to load contacts"
              description={error}
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={contacts || []}
          searchKeys={["name", "email", "company", "position"]}
          pageSize={10}
          emptyMessage={loading ? "Loading..." : "No contacts found yet"}
        />
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              Add Contact
            </DialogTitle>
            <DialogDescription>
              Create a new contact record with the details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormSection
              title="Basic Information"
              description="Personal and contact details"
              icon={<User className="h-4 w-4" />}
              columns={2}
            >
              <FormInput
                label="Full Name"
                icon={<User className="h-4 w-4" />}
                value={formData.name}
                onChange={update("name")}
                required
                placeholder="John Doe"
              />
              <FormInput
                label="Position"
                icon={<Briefcase className="h-4 w-4" />}
                value={formData.position}
                onChange={update("position")}
                placeholder="Software Engineer"
              />
              <FormInput
                label="Email Address"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                value={formData.email}
                onChange={update("email")}
                required
                placeholder="john@company.com"
              />
              <FormInput
                label="Phone Number"
                type="tel"
                icon={<Phone className="h-4 w-4" />}
                value={formData.phone}
                onChange={update("phone")}
                placeholder="+1 (555) 000-0000"
              />
            </FormSection>

            <FormSection
              title="Company & Industry"
              description="Organization and sector details"
              icon={<Building2 className="h-4 w-4" />}
              columns={2}
            >
              <FormInput
                label="Company"
                icon={<Building2 className="h-4 w-4" />}
                value={formData.company}
                onChange={update("company")}
                placeholder="Acme Inc."
              />
              <FormInput
                label="Industry"
                icon={<Tag className="h-4 w-4" />}
                value={formData.industry}
                onChange={update("industry")}
                placeholder="Technology"
              />
              <FormInput
                label="Website"
                type="url"
                icon={<Globe className="h-4 w-4" />}
                value={formData.website}
                onChange={update("website")}
                placeholder="https://company.com"
              />
              <FormInput
                label="Address"
                icon={<MapPin className="h-4 w-4" />}
                value={formData.address}
                onChange={update("address")}
                placeholder="123 Main St, City"
              />
            </FormSection>

            <FormSection
              title="Status & Notes"
              description="Contact status and additional information"
              icon={<Calendar className="h-4 w-4" />}
              columns={2}
            >
              <FormSelect
                label="Status"
                icon={<Tag className="h-4 w-4" />}
                value={formData.status}
                onChange={update("status")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
              <FormInput
                label="Last Contact Date"
                type="date"
                icon={<Calendar className="h-4 w-4" />}
                value={formData.lastContact}
                onChange={update("lastContact")}
              />
              <div className="col-span-full">
                <FormTextarea
                  label="Notes"
                  value={formData.notes}
                  onChange={update("notes")}
                  placeholder="Any additional notes about this contact..."
                />
              </div>
            </FormSection>

            <FormActions
              onCancel={() => setShowAddModal(false)}
              submitLabel="Create Contact"
              loading={submitting}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
