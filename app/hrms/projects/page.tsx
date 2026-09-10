"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  LayoutDashboard,
  ListTodo,
  Users,
  Milestone,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

// ── Types ───────────────────────────────────────────────

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: "planning" | "in_progress" | "completed" | "on_hold" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  ownerId: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  progress?: number;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  overdueTasks: number;
  projects: ProjectData[];
}

// ── Helpers ─────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────

export default function ProjectsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", status: "planning", priority: "medium", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hrm/v2/projects?dashboard=true");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setStats(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── DataTable Columns ────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/hrm/v2/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ownerId: user?.id }),
      });
      setShowCreate(false);
      setForm({ name: "", description: "", status: "planning", priority: "medium", startDate: "", endDate: "" });
      fetchDashboard();
    } catch { /* empty */ }
    setSaving(false);
  };

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
            <Link
              href={`/projects/all?id=${project.id}`}
              className="text-sm font-semibold text-dark dark:text-white hover:text-primary transition-colors"
            >
              {project.name}
            </Link>
            {project.description && (
              <p className="text-xs text-muted line-clamp-1">{project.description}</p>
            )}
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
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress || 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                (project.progress || 0) >= 80 ? "bg-success" : (project.progress || 0) >= 40 ? "bg-amber-500" : "bg-primary"
              }`}
            />
          </div>
          <span className="text-xs font-medium text-muted w-8">{project.progress || 0}%</span>
        </div>
      ),
    },
  ];

  // ── Loading State ────────────────────────────────────

  if (loading) {
    return (
      <AppShell title="Projects">
        <PageHeader title="Projects" description="Manage projects, tasks, teams, and milestones." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-card rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  // ── Error State ──────────────────────────────────────

  if (error) {
    return (
      <AppShell title="Projects">
        <PageHeader title="Projects" description="Manage projects, tasks, teams, and milestones." />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-xl border border-border p-12 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-danger/10 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-8 w-8 text-danger" />
          </div>
          <p className="text-dark dark:text-white font-semibold text-lg">Failed to load projects</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">{error}</p>
          <Button className="mt-4" variant="outline" onClick={fetchDashboard}>Try Again</Button>
        </motion.div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Projects">
      <PageHeader
        title="Projects"
        description="Manage projects, tasks, teams, and milestones."
      >
        <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Add Project</Button>
        <Link href="/hrms/projects/all">
          <Button variant="outline"><Plus className="mr-2 h-4 w-4" />View All</Button>
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Projects</p>
              <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats?.totalProjects || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Active Projects</p>
              <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats?.activeProjects || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats?.completedProjects || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Overdue Tasks</p>
              <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats?.overdueTasks || 0}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-danger" />
            </div>
          </div>
        </CardContent></Card>
      </motion.div>

      {/* Sub-navigation links */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link href="/hrms/projects/all" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <ListTodo className="h-4 w-4" />All Projects
        </Link>
        <Link href="/hrms/projects/tasks" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-muted hover:text-dark dark:hover:text-white hover:border-primary/30 transition-colors">
          <LayoutDashboard className="h-4 w-4" />Kanban Board
        </Link>
        <Link href="/hrms/projects/teams" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-muted hover:text-dark dark:hover:text-white hover:border-primary/30 transition-colors">
          <Users className="h-4 w-4" />Teams
        </Link>
        <Link href="/hrms/projects/milestones" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-muted hover:text-dark dark:hover:text-white hover:border-primary/30 transition-colors">
          <Milestone className="h-4 w-4" />Milestones
        </Link>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6">
          <h3 className="font-bold text-sm mb-4">Create New Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs" />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs">
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs" />
            <input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs" />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleCreate} disabled={saving} className="text-xs">{saving ? "Creating..." : "Create Project"}</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={stats?.projects ?? []}
        searchable
        searchKeys={["name", "description"]}
        pageSize={10}
        loading={false}
        emptyMessage="No projects yet"
        striped
        stickyHeader
      />
    </AppShell>
  );
}
