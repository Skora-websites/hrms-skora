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
  FileText,
  Plus,
  Download,
  Upload,
  Folder,
  File,
  Image,
  FileSpreadsheet,
  FileArchive,
  Pencil,
  Trash2,
} from "lucide-react";
import { useDocuments } from "@/hooks/hrm/use-documents";
import { useMutation } from "@/hooks/use-mutation";
import { formatDate } from "@/lib/utils";

const fileIcons: Record<string, React.ElementType> = {
  pdf: FileText, doc: FileText, docx: FileText,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet,
  png: Image, jpg: Image, jpeg: Image, gif: Image, svg: Image,
  zip: FileArchive, rar: FileArchive,
};

const emptyForm = { title: "", categoryId: "", userId: "", fileType: "", fileSize: 0, status: "active" };

export default function DocumentsPage() {
  const { data: documents, loading, error, refetch } = useDocuments();
  const mutation = useMutation();

  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleCreate = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/documents", form);
    if (result) { setShowUpload(false); resetForm(); refetch(); }
  };

  const handleEdit = async () => {
    if (!selectedDoc) return;
    const result = await mutation.updateRecord(`/api/hrm/v2/documents?id=${selectedDoc.id}`, form);
    if (result) { setShowEdit(false); setSelectedDoc(null); resetForm(); refetch(); }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    const result = await mutation.deleteRecord(`/api/hrm/v2/documents?id=${selectedDoc.id}`);
    if (result) { setShowDelete(false); setSelectedDoc(null); refetch(); }
  };

  const openEdit = (doc: any) => {
    setSelectedDoc(doc);
    setForm({ title: doc.title || "", categoryId: doc.categoryId || "", userId: doc.userId || "", fileType: doc.fileType || "", fileSize: doc.fileSize || 0, status: doc.status || "active" });
    setShowEdit(true);
  };

  const safeDocs = documents || [];

  const columns: Column<any>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      cell: (doc: any) => {
        const ext = doc.fileType?.split("/").pop()?.split("+")[0] || "";
        const Icon = fileIcons[ext] || File;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary/10 flex items-center justify-center text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark dark:text-white">{doc.title}</p>
              <p className="text-xs text-muted">{doc.categoryId || "General"}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "fileType",
      header: "Type",
      cell: (doc: any) => {
        const ext = doc.fileType?.split("/").pop()?.split("+")[0] || doc.fileType || "—";
        return <span className="text-xs font-mono text-muted uppercase">{ext}</span>;
      },
    },
    {
      key: "fileSize",
      header: "Size",
      sortable: true,
      cell: (doc: any) => (
        <span className="text-sm text-muted">{doc.fileSize > 0 ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "—"}</span>
      ),
    },
    {
      key: "userId",
      header: "User",
      cell: (doc: any) => <span className="text-sm text-muted">{doc.userId || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (doc: any) => (
        <Badge variant={doc.status === "active" ? "success" : doc.status === "expired" ? "danger" : "warning"} size="sm">
          {doc.status || "active"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      cell: (doc: any) => (
        <span className="text-xs text-muted">{doc.createdAt ? formatDate(doc.createdAt as any) : "—"}</span>
      ),
    },
  ];

  const actions: Action<any>[] = [
    { label: "Edit", icon: Pencil, onClick: (d: any) => openEdit(d), variant: "ghost" },
    { label: "Delete", icon: Trash2, onClick: (d: any) => { setSelectedDoc(d); setShowDelete(true); }, variant: "ghost" },
  ];

  return (
    <AppShell title="Documents">
      <PageHeader title="Documents" description="Manage employee documents, contracts, and company files.">
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export All</Button>
          <Button onClick={() => { resetForm(); setShowUpload(true); }}><Upload className="mr-2 h-4 w-4" />Upload</Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Documents", value: safeDocs.length || "—", icon: FileText, color: "text-primary" },
          { label: "Active", value: safeDocs.filter((d: any) => d.status === "active").length, icon: File, color: "text-info" },
          { label: "Verified", value: safeDocs.filter((d: any) => d.isVerified).length, icon: Folder, color: "text-warning" },
          { label: "Expired", value: safeDocs.filter((d: any) => d.status === "expired").length, icon: Upload, color: "text-success" },
        ].map((stat: any) => (
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
        data={safeDocs}
        searchable
        searchKeys={["title", "categoryId", "fileType", "userId"]}
        pageSize={12}
        loading={loading}
        error={error || undefined}
        onRetry={refetch}
        emptyMessage="No documents found"
        actions={actions}
        striped
        stickyHeader
      />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              Upload Document
            </DialogTitle>
            <DialogDescription>Add a new document record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-6">
            <FormSection title="Document Details" icon={<FileText className="h-4 w-4" />} columns={2}>
              <div className="col-span-full"><FormInput label="Title" icon={<FileText className="h-4 w-4" />} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Employment Contract" /></div>
              <FormSelect label="File Type" icon={<File className="h-4 w-4" />} value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })} options={[{ value: "", label: "Select type..." }, { value: "pdf", label: "PDF" }, { value: "docx", label: "Word" }, { value: "xlsx", label: "Excel" }, { value: "png", label: "Image" }]} />
              <FormInput label="Category" icon={<Folder className="h-4 w-4" />} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} placeholder="contracts" />
              <FormInput label="User ID" icon={<FileText className="h-4 w-4" />} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="user_123" />
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowUpload(false)} submitLabel="Create Document" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              Edit Document
            </DialogTitle>
            <DialogDescription>Update document details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-6">
            <FormSection title="Document Details" icon={<FileText className="h-4 w-4" />} columns={2}>
              <div className="col-span-full"><FormInput label="Title" icon={<FileText className="h-4 w-4" />} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
              <FormInput label="Category" icon={<Folder className="h-4 w-4" />} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} />
              <FormSelect label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "expired", label: "Expired" }, { value: "archived", label: "Archived" }]} />
            </FormSection>
            {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
            <FormActions onCancel={() => setShowEdit(false)} submitLabel="Save Changes" loading={mutation.loading} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Delete Document
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete <strong>{selectedDoc?.title}</strong>? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDelete(false)} disabled={mutation.loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
