"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column, Action } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { useProjects } from "@/hooks/hrm";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import type { Project } from "@/types";

// ── Types ───────────────────────────────────────────────

type ProjectData = {
  [K in keyof Project]: Project[K];
};

// ── Constants ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusBadge: Record<string, "success" | "warning" | "danger" | "info" | "default" | "subtle"> = {
  planning: "info",
  in_progress: "warning",
  completed: "success",
  on_hold: "default",
  cancelled: "danger",
};

const priorityColors: Record<string, string> = {
  low: "text-blue-500",
  medium: "text-amber-500",
  high: "text-orange-500",
  critical: "text-danger",
};

const EMPTY_PROJECT_FORM = {
  name: "", description: "", status: "planning" as Project["status"],
  priority: "medium" as Project["priority"], budget: "", startDate: "", endDate: "",
};

// ── Component ───────────────────────────────────────────

export default function AllProjectsPage() {
  const { user } = useAuth();
  const { data: projects, loading, error, refetch } = useProjects();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [projectForm, setProjectForm] = useState(EMPTY_PROJECT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isEditing = !!editingProject;

  const openCreateDialog = () => {
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT_FORM);
    setShowDialog(true);
  };

  const openEditDialog = (project: ProjectData) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name, description: project.description || "",
      status: project.status, priority: project.priority,
      budget: project.budget ? String(project.budget) : "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingProject(null);
    setProjectForm(EMPTY_PROJECT_FORM);
  };

  const handleSave = async () => {
    if (!projectForm.name.trim()) return;
    setSaving(true);
    try {
      const url = isEditing ? `/api/hrm/v2/projects?id=${editingProject!.id}` : "/api/hrm/v2/projects";
      const method = isEditing ? "PATCH" : "POST";
      const payload = {
        ...projectForm,
        budget: projectForm.budget ? Number(projectForm.budget) : 0,
      };
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to save project"); }
      toast.success(isEditing ? "Project Updated" : "Project Created",
        isEditing ? `"${projectForm.name}" has been updated.` : `"${projectForm.name}" has been created successfully.`);
      closeDialog();
      refetch();
    } catch (err: any) { toast.error("Error", err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated tasks and members.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/hrm/v2/projects?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      toast.success("Project Deleted", `"${name}" has been deleted.`);
      refetch();
    } catch (err: any) { toast.error("Error", err.message); }
    finally { setDeleting(null); }
  };

  // ── Columns ──────────────────────────────────────────

  const columns: Column<ProjectData>[] = [
    {
      key: "name",
      header: "Project",
      sortable: true,
      cell: (project: ProjectData) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dark dark:text-white">{project.name}</p>
            {project.description && <p className="text-xs text-muted line-clamp-1">{project.description}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (project: ProjectData) => (
        <Badge variant={statusBadge[project.status] || "info"} size="sm">
          {project.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      cell: (project: ProjectData) => (
        <span className={`text-xs font-medium ${priorityColors[project.priority] || "text-muted"}`}>
          {project.priority}
        </span>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      sortable: true,
      cell: (project: ProjectData) => (
        <span className="text-sm text-muted font-medium">
          {(project as any).budget ? `₹${(project as any).budget.toLocaleString()}` : "—"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      cell: (project: ProjectData) => (
        <span className="text-sm text-muted">
          {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      cell: (project: ProjectData) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(project as any).progress || 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                ((project as any).progress || 0) >= 80 ? "bg-success" : ((project as any).progress || 0) >= 40 ? "bg-amber-500" : "bg-primary"
              }`}
            />
          </div>
          <span className="text-xs font-medium text-muted w-8">{(project as any).progress || 0}%</span>
        </div>
      ),
    },
  ];

  const actions: Action<ProjectData>[] = [
    { label: "Edit", icon: Edit3, onClick: (p: ProjectData) => openEditDialog(p), variant: "ghost" },
    { label: "Delete", icon: Trash2, onClick: (p: ProjectData) => handleDelete(p.id, p.name), variant: "ghost" },
  ];

  const safeProjects = projects || [];

  // ── Render ───────────────────────────────────────────

  return (
    <AppShell title="All Projects">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
              <Toast variant={t.variant} message={t.message} description={t.description} onClose={() => toast.dismissToast(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="All Projects" description="Create, edit, and manage all projects.">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </PageHeader>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={safeProjects}
        searchable
        searchKeys={["name", "description"]}
        pageSize={10}
        loading={loading}
        error={error || undefined}
        onRetry={refetch}
        emptyMessage="No projects yet"
        actions={actions}
        striped
        stickyHeader
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        }
      />

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>{isEditing ? "Edit Project" : "Create New Project"}</DialogTitle>
                <DialogDescription>
                  {isEditing ? "Update the project details below." : "Fill in the details to create a new project."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-5 px-0.5">
              <FormSection title="Project Details" columns={2} gradient>
                <FormInput label="Project Name" icon={<FolderKanban className="h-4 w-4" />} value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. Website Redesign" required />
                <FormSelect label="Priority" icon={<AlertCircle className="h-4 w-4" />} value={projectForm.priority} onChange={(e) => setProjectForm({ ...projectForm, priority: e.target.value as Project["priority"] })} options={PRIORITY_OPTIONS} />
                <FormSelect label="Status" icon={<Clock className="h-4 w-4" />} value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as Project["status"] })} options={STATUS_OPTIONS} />
                <FormInput label="Budget (₹)" icon={<span className="text-xs font-bold">₹</span>} type="number" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })} placeholder="e.g. 500000" />
                <FormInput label="Start Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
                <FormInput label="End Date" icon={<CalendarDays className="h-4 w-4" />} type="date" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} />
              </FormSection>
              <FormSection title="Description" columns={1}>
                <FormTextarea label="Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Describe the project goals and scope..." />
              </FormSection>
            </div>
            <FormActions onCancel={closeDialog} submitLabel={saving ? "Saving..." : isEditing ? "Update Project" : "Create Project"} submitIcon={saving ? undefined : isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} loading={saving} error={null} />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
