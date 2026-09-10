"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Milestone,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  Flag,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useProjects, useProjectTasks } from "@/hooks/hrm";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

// ── Types ───────────────────────────────────────────────

interface MilestoneData {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  completedAt?: string;
}

// ── Constants ───────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
];

const statusBadge: Record<string, "info" | "warning" | "success" | "danger"> = {
  pending: "info",
  in_progress: "warning",
  completed: "success",
  delayed: "danger",
};

const EMPTY_MILESTONE_FORM = {
  projectId: "",
  title: "",
  description: "",
  dueDate: "",
  status: "pending" as MilestoneData["status"],
};

// ── Component ───────────────────────────────────────────

export default function MilestonesPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const toast = useToast();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialog states
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneData | null>(null);
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchMilestones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ milestones: "true" });
      if (selectedProject) params.set("projectId", selectedProject);
      const res = await fetch(`/api/hrm/v2/projects?${params}`);
      if (!res.ok) throw new Error("Failed to fetch milestones");
      const json = await res.json();
      setMilestones(json.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // Set default project
  useEffect(() => {
    if (!selectedProject && projects && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const openCreateDialog = () => {
    setEditingMilestone(null);
    setMilestoneForm({
      ...EMPTY_MILESTONE_FORM,
      projectId: selectedProject || (projects?.[0]?.id || ""),
    });
    setShowDialog(true);
  };

  const openEditDialog = (milestone: MilestoneData) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      projectId: milestone.projectId,
      title: milestone.title,
      description: milestone.description || "",
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : "",
      status: milestone.status,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingMilestone(null);
    setMilestoneForm(EMPTY_MILESTONE_FORM);
  };

  const handleSave = async () => {
    if (!milestoneForm.title.trim() || !milestoneForm.projectId) return;
    setSaving(true);
    try {
      const url = editingMilestone
        ? `/api/hrm/v2/projects?type=milestone&milestoneId=${editingMilestone.id}`
        : "/api/hrm/v2/projects?action=milestone";
      const method = editingMilestone ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestoneForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save milestone");
      }
      toast.success(
        editingMilestone ? "Milestone Updated" : "Milestone Created",
        `"${milestoneForm.title}" has been saved.`
      );
      closeDialog();
      fetchMilestones();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=milestone&milestoneId=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete milestone");
      toast.success("Milestone Deleted", "Milestone has been deleted.");
      fetchMilestones();
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "in_progress" : "completed";
    try {
      const res = await fetch(`/api/hrm/v2/projects?type=milestone&milestoneId=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completedAt: newStatus === "completed" ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update milestone");
      fetchMilestones();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const filteredMilestones = milestones.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.title.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q);
  });

  const stats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "completed").length,
    inProgress: milestones.filter((m) => m.status === "in_progress").length,
    delayed: milestones.filter((m) => m.status === "delayed").length,
  };

  return (
    <AppShell title="Milestones">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}>
              <Toast variant={t.variant} message={t.message} description={t.description} onClose={() => toast.dismissToast(t.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="Milestones" description="Track project milestones and key deliverables.">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Milestone
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Milestones</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                <Milestone className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Completed</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.completed}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.inProgress}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Delayed</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.delayed}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-danger/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="">Select a project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search milestones..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!selectedProject ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
            <Milestone className="h-8 w-8 text-primary" />
          </div>
          <p className="text-dark dark:text-white font-semibold text-lg">Select a project</p>
          <p className="text-sm text-muted mt-1">Choose a project to view its milestones.</p>
        </div>
      ) : error ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-dark dark:text-white font-semibold">Failed to load milestones</p>
          <p className="text-sm text-muted mt-1">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchMilestones}>Try Again</Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredMilestones.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
            <Flag className="h-8 w-8 text-primary" />
          </div>
          <p className="text-dark dark:text-white font-semibold text-lg">
            {search ? "No milestones match your search" : "No milestones yet"}
          </p>
          <p className="text-sm text-muted mt-1">
            {search ? "Try adjusting your search terms." : "Add milestones to track key project deliverables."}
          </p>
          {!search && (
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Milestone
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMilestones.map((milestone, idx) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer group"
              onClick={() => openEditDialog(milestone)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusToggle(milestone.id, milestone.status);
                    }}
                    className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                      milestone.status === "completed"
                        ? "bg-success border-success text-white"
                        : "border-muted hover:border-primary"
                    }`}
                  >
                    {milestone.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${milestone.status === "completed" ? "text-muted line-through" : "text-dark dark:text-white"}`}>
                        {milestone.title}
                      </p>
                      <Badge variant={statusBadge[milestone.status] || "info"} size="sm">
                        {milestone.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {milestone.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{milestone.description}</p>
                    )}
                    {milestone.dueDate && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <CalendarDays className="h-3 w-3 text-muted" />
                        <span className={`text-xs ${new Date(milestone.dueDate) < new Date() && milestone.status !== "completed" ? "text-danger" : "text-muted"}`}>
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(milestone.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <Milestone className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>{editingMilestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
                <DialogDescription>
                  {editingMilestone ? "Update milestone details." : "Define a key project milestone."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-5 px-0.5">
              <FormSection title="Milestone Details" columns={2} gradient>
                <FormInput
                  label="Milestone Name"
                  icon={<Flag className="h-4 w-4" />}
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g. Phase 1 Complete"
                  required
                />
                <FormSelect
                  label="Project"
                  icon={<Milestone className="h-4 w-4" />}
                  value={milestoneForm.projectId}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}
                  options={projects?.map((p) => ({ value: p.id, label: p.name })) || []}
                  required
                />
                <FormSelect
                  label="Status"
                  icon={<Clock className="h-4 w-4" />}
                  value={milestoneForm.status}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as MilestoneData["status"] })}
                  options={STATUS_OPTIONS}
                />
                <FormInput
                  label="Due Date"
                  icon={<CalendarDays className="h-4 w-4" />}
                  type="date"
                  value={milestoneForm.dueDate}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                />
              </FormSection>
              <FormSection title="Description" columns={1}>
                <FormTextarea
                  label="Description"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  placeholder="Describe this milestone..."
                />
              </FormSection>
            </div>
            <FormActions
              onCancel={closeDialog}
              submitLabel={saving ? "Saving..." : editingMilestone ? "Update" : "Create Milestone"}
              loading={saving}
              error={null}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
