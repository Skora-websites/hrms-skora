"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
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
import {
  Target,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  ArrowUp,
  ArrowDown,
  Users,
  Calendar,
} from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ───────────────────────────────────────────────

interface GoalItem {
  id: string;
  title: string;
  userId?: string;
  category: string;
  status: string;
  priority: string;
  progress: number;
  targetDate?: string;
  createdAt: string;
}

interface ReviewItem {
  id: string;
  userId?: string;
  reviewerId?: string;
  reviewType?: string;
  period?: string;
  overallRating?: number;
  status: string;
  createdAt: string;
}

const GOAL_CATEGORIES = [
  { value: "performance", label: "Performance" },
  { value: "development", label: "Development" },
  { value: "career", label: "Career" },
  { value: "personal", label: "Personal" },
];

const GOAL_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusBadge: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "info",
  in_progress: "primary",
  achieved: "success",
  partially_achieved: "warning",
  not_achieved: "danger",
  submitted: "warning",
  acknowledged: "primary",
  completed: "success",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3.5 w-3.5" />,
  in_progress: <TrendingUp className="h-3.5 w-3.5" />,
  achieved: <CheckCircle2 className="h-3.5 w-3.5" />,
  partially_achieved: <AlertCircle className="h-3.5 w-3.5" />,
  not_achieved: <AlertCircle className="h-3.5 w-3.5" />,
};

const EMPTY_GOAL_FORM = {
  title: "",
  employee: "",
  category: "performance",
  priority: "medium",
  targetDate: "",
  description: "",
};

// ── Component ───────────────────────────────────────────

export default function PerformancePage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, reviewsRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=goals"),
        fetch("/api/hrm/v2/performance?type=reviews"),
      ]);
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.data || []);
      } else {
        setGoals([]);
      }
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.data || []);
      } else {
        setReviews([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const mutation = useMutation();
  const toast = useToast();

  // Dialog states
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);

  const resetGoalForm = () => setGoalForm(EMPTY_GOAL_FORM);

  const handleAddGoal = async () => {
    if (!goalForm.title.trim() || !goalForm.employee.trim()) return;

    const result = await mutation.createRecord("/api/hrm/v2/performance", {
      action: "create_goal",
      title: goalForm.title,
      userId: goalForm.employee,
      category: goalForm.category,
      priority: goalForm.priority,
      targetDate: goalForm.targetDate || undefined,
      description: goalForm.description,
    });
    if (result) {
      setShowAddGoalDialog(false);
      resetGoalForm();
      fetchData();
      toast.success("Goal created", `"${goalForm.title}" has been added successfully.`);
    }
  };

  // ── Computed Stats ─────────────────────────────────

  const stats = useMemo(() => ({
    totalGoals: goals.length,
    achievedGoals: goals.filter((g) => g.status === "achieved").length,
    activeReviews: reviews.filter((r) => r.status === "submitted" || r.status === "draft").length,
    pendingFeedback: 5,
    averageProgress: goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
      : 0,
  }), [goals, reviews]);

  // ── Columns ─────────────────────────────────────────

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Goal",
        sortable: true,
        cell: (goal: any) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark dark:text-white truncate">{goal.title}</p>
            </div>
          </div>
        ),
      },
      {
        key: "userId",
        header: "Employee",
        sortable: true,
        cell: (goal: any) => (
          <span className="text-sm text-muted flex items-center gap-1">
            <Users className="h-3 w-3" />
            {goal.userId || "—"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: "category",
        header: "Category",
        sortable: true,
        cell: (goal: any) => <span className="text-sm text-muted">{goal.category}</span>,
        hideOnTablet: true,
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        cell: (goal: any) => (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            goal.priority === "critical" ? "bg-danger/10 text-danger" :
            goal.priority === "high" ? "bg-warning/10 text-warning" :
            goal.priority === "medium" ? "bg-primary/10 text-primary" :
            "bg-gray-100 dark:bg-gray-800 text-muted"
          }`}>
            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (goal: any) => (
          <Badge variant={statusBadge[goal.status]} size="sm">
            <span className="flex items-center gap-1">
              {statusIcons[goal.status]}
              {goal.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
          </Badge>
        ),
      },
      {
        key: "progress",
        header: "Progress",
        sortable: true,
        cell: (goal: any) => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  goal.progress >= 100 ? "bg-success" :
                  goal.progress >= 60 ? "bg-primary" :
                  goal.progress >= 30 ? "bg-warning" : "bg-danger"
                }`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-dark dark:text-white">{goal.progress}%</span>
          </div>
        ),
      },
      {
        key: "targetDate",
        header: "Target",
        sortable: true,
        cell: (goal: any) => (
          <span className="text-xs text-muted flex items-center gap-1 justify-end">
            <Calendar className="h-3 w-3" />
            {goal.targetDate}
          </span>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideOnMobile: true,
      },
    ],
    []
  );

  // ── Sub-navigation ──────────────────────────────────

  const subNav = (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href="/hrms/performance/goals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Target className="h-4 w-4" />
        Goals
      </Link>
      <span className="text-muted">|</span>
      <Link
        href="/hrms/performance/reviews"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Star className="h-4 w-4" />
        Reviews
      </Link>
      <span className="text-muted">|</span>
      <Link
        href="/hrms/performance/feedback"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Feedback
      </Link>
      <span className="text-muted">|</span>
      <Link
        href="/hrms/performance/kpis"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <BarChart3 className="h-4 w-4" />
        KPIs
      </Link>
    </div>
  );

  const summaryLoading = loading && goals.length === 0;

  return (
    <AppShell title="Performance">
      {/* Toasts */}
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toast
                variant={t.variant}
                message={t.message}
                description={t.description}
                onClose={() => toast.dismissToast(t.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="Performance"
        description="Track goals, performance reviews, feedback, and KPIs."
      >
        <Button onClick={() => { resetGoalForm(); setShowAddGoalDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Goals</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.totalGoals}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              <span className="text-success font-medium">{stats.achievedGoals}</span> achieved
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Active Reviews</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.activeReviews}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              <span className="text-amber-500 font-medium">{reviews.length - stats.activeReviews}</span> completed
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Avg Progress</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{goals.length > 0 ? stats.averageProgress : "—"}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              {stats.averageProgress >= 70 ? (
                <ArrowUp className="h-3 w-3 text-success" />
              ) : (
                <ArrowDown className="h-3 w-3 text-danger" />
              )}
              <span>overall</span>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Pending Feedback</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">{stats.pendingFeedback}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-success" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              <span className="text-success font-medium">{stats.pendingFeedback}</span> need response
            </div>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={goals}
        searchable
        searchPlaceholder="Search goals by title or employee..."
        searchKeys={["title", "userId"]}
        defaultPageSize={10}
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={() => fetchData()}
        emptyMessage="No goals created yet"
        filters={subNav}
        showEntriesSelector
        showRecordCount
        skeletonRows={5}
        ariaLabel="Performance goals table"
      />

      {/* ── Add Goal Dialog ── */}
      <Dialog
        open={showAddGoalDialog}
        onOpenChange={(open) => {
          if (!open && !mutation.loading) { setShowAddGoalDialog(false); resetGoalForm(); }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Add New Goal</DialogTitle>
                <DialogDescription>
                  Create a goal to track performance and development progress.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddGoal(); }}>
            <div className="space-y-5 px-0.5">
              <FormSection title="Goal Details" columns={2} gradient>
                <FormInput
                  label="Goal Title"
                  icon={<Target className="h-4 w-4" />}
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="e.g. Improve customer satisfaction"
                  required
                />
                <FormInput
                  label="Employee"
                  icon={<Users className="h-4 w-4" />}
                  value={goalForm.employee}
                  onChange={(e) => setGoalForm({ ...goalForm, employee: e.target.value })}
                  placeholder="e.g. Alice Johnson"
                  required
                />
                <FormSelect
                  label="Category"
                  icon={<Target className="h-4 w-4" />}
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                  options={GOAL_CATEGORIES}
                />
                <FormSelect
                  label="Priority"
                  icon={<TrendingUp className="h-4 w-4" />}
                  value={goalForm.priority}
                  onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value })}
                  options={GOAL_PRIORITIES}
                />
              </FormSection>
              <FormSection title="Timeline" columns={1}>
                <FormInput
                  label="Target Date"
                  icon={<Calendar className="h-4 w-4" />}
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                />
              </FormSection>
              <FormSection title="Description" columns={1}>
                <FormTextarea
                  label="Description"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe the goal, expected outcomes, and success criteria..."
                />
              </FormSection>
            </div>
            <FormActions
              onCancel={() => { setShowAddGoalDialog(false); resetGoalForm(); }}
              submitLabel={mutation.loading ? "Creating..." : "Create Goal"}
              submitIcon={mutation.loading ? undefined : <Plus className="h-4 w-4" />}
              loading={mutation.loading}
              error={mutation.error}
            />
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
