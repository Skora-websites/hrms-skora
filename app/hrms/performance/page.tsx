"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";
import {
  calculateEmployeePerformance,
  calculateTeamOverview,
  type PerformanceUser,
  type GoalItem,
  type ReviewItem,
  type KpiItem,
  type FeedbackItem,
} from "@/lib/performance/performance-calculator";
import { EmployeePerformanceTab } from "@/components/performance/employee-performance-tab";

// ── Dropdown Choices ──────────────────────────────────────────

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
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const managerDept = user?.department || "Development";

  const [activeTab, setActiveTab] = useState("employees");
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<PerformanceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation();
  const toast = useToast();

  // Dialog state
  const [showAddGoalDialog, setShowAddGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);

  const resetGoalForm = () => setGoalForm(EMPTY_GOAL_FORM);

  // Fetch all performance data and user directory
  const fetchData = useCallback(async () => {
    try {
      const [goalsRes, reviewsRes, kpisRes, feedbackRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=goals"),
        fetch("/api/hrm/v2/performance?type=reviews"),
        fetch("/api/hrm/v2/performance?type=kpis"),
        fetch("/api/hrm/v2/performance?type=feedback"),
        fetch("/api/hrm/v2/users?action=list"),
      ]);

      const [goalsData, reviewsData, kpisData, feedbackData, usersData] = await Promise.all([
        goalsRes.ok ? goalsRes.json() : { data: [] },
        reviewsRes.ok ? reviewsRes.json() : { data: [] },
        kpisRes.ok ? kpisRes.json() : { data: [] },
        feedbackRes.ok ? feedbackRes.json() : { data: [] },
        usersRes.ok ? usersRes.json() : { data: [] },
      ]);

      setGoals(goalsData.data || []);
      setReviews(reviewsData.data || []);
      setKpis(kpisData.data || []);
      setFeedbacks(feedbackData.data || []);
      setUsers(usersData.data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load performance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scope user directory based on role: managers see only their department team members
  const scopedUsers = useMemo(() => {
    if (!isManager) return users;
    const targetDept = managerDept.toLowerCase().trim();
    return users.filter((u) => {
      const uDept = String(u.department || (u as any).departmentName || "").toLowerCase().trim();
      if (uDept && uDept === targetDept) return true;
      const rep = String((u as any).reportingManager || "").toLowerCase().trim();
      const mName = String(user?.name || "").toLowerCase().trim();
      const mEmail = String(user?.email || "").toLowerCase().trim();
      if (mName && rep === mName) return true;
      if (mEmail && rep === mEmail) return true;
      if (u.id === user?.id || (u as any)._id === user?.id) return true;
      return false;
    });
  }, [users, isManager, managerDept, user]);

  // Lookup map: user ID -> User Name / Display Name
  const userMap = useMemo(() => {
    const map = new Map<string, PerformanceUser>();
    for (const u of scopedUsers) {
      map.set(u.id, u);
    }
    return map;
  }, [scopedUsers]);

  // Employee dropdown options for creating goals
  const userSelectOptions = useMemo(() => {
    return scopedUsers.map((u) => ({
      value: u.id,
      label: u.displayName || u.name || u.email || u.id,
    }));
  }, [scopedUsers]);

  // Scoped goals for managers
  const scopedGoals = useMemo(() => {
    if (!isManager) return goals;
    const allowedIds = new Set(scopedUsers.map((u) => String(u.id)));
    if (user?.id) allowedIds.add(String(user.id));
    return goals.filter((g) => g.userId && allowedIds.has(String(g.userId)));
  }, [goals, isManager, scopedUsers, user?.id]);

  // Computed employee performance summaries & team overview
  const employeeSummaries = useMemo(() => {
    return calculateEmployeePerformance(scopedUsers, scopedGoals, reviews, kpis, feedbacks);
  }, [scopedUsers, scopedGoals, reviews, kpis, feedbacks]);

  const teamOverview = useMemo(() => {
    return calculateTeamOverview(employeeSummaries);
  }, [employeeSummaries]);

  // Handle Add Goal
  const handleAddGoal = async () => {
    if (!goalForm.title.trim() || !goalForm.employee.trim()) {
      toast.error("Validation error", "Please enter a title and select an employee.");
      return;
    }

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

  // ── Goals Table Columns ─────────────────────────────────

  const goalColumns: Column<GoalItem>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Goal Title",
        sortable: true,
        cell: (goal: GoalItem) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0">
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{goal.title}</p>
              {goal.description && (
                <p className="text-xs text-muted truncate max-w-sm">{goal.description}</p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "userId",
        header: "Assigned Employee",
        sortable: true,
        cell: (goal: GoalItem) => {
          const user = goal.userId ? userMap.get(goal.userId) : null;
          const name = user ? user.displayName || user.name || user.email : goal.userId || "Unassigned";
          return (
            <span className="text-sm text-foreground font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted" />
              {name}
            </span>
          );
        },
      },
      {
        key: "category",
        header: "Category",
        sortable: true,
        cell: (goal: GoalItem) => (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
            {goal.category}
          </span>
        ),
        hideOnTablet: true,
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        cell: (goal: GoalItem) => (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded ${
              goal.priority === "critical"
                ? "bg-danger/10 text-danger border border-danger/20"
                : goal.priority === "high"
                ? "bg-warning/10 text-warning border border-warning/20"
                : goal.priority === "medium"
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (goal: GoalItem) => (
          <Badge variant={statusBadge[goal.status] || "info"} size="sm">
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
        cell: (goal: GoalItem) => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  goal.progress >= 100
                    ? "bg-success"
                    : goal.progress >= 60
                    ? "bg-primary"
                    : goal.progress >= 30
                    ? "bg-warning"
                    : "bg-danger"
                }`}
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground">{goal.progress}%</span>
          </div>
        ),
      },
      {
        key: "targetDate",
        header: "Target Date",
        sortable: true,
        cell: (goal: GoalItem) => (
          <span className="text-xs text-muted flex items-center gap-1 justify-end">
            <Calendar className="h-3 w-3" />
            {goal.targetDate || "Not set"}
          </span>
        ),
        className: "text-right",
        headerClassName: "text-right",
        hideOnMobile: true,
      },
    ],
    [userMap]
  );

  return (
    <AppShell title="Performance">
      {/* Toast notifications */}
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
        title={isManager ? "Team Performance Hub" : "Performance Hub"}
        description={
          isManager
            ? `Track goals, reviews, and scorecards for the ${managerDept} team.`
            : "Track goals, performance reviews, 360 feedback, and employee KPI scorecards."
        }
      >
        <div className="flex items-center gap-2">
          {isManager && (
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1"
            >
              {managerDept} Team
            </Badge>
          )}
          <Button
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={() => {
              resetGoalForm();
              setShowAddGoalDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Goal
          </Button>
        </div>
      </PageHeader>

      {/* ── Sub-navigation Links to Dedicated Modules ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5 pb-3 border-b border-border/70 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-muted font-semibold uppercase tracking-wider text-[11px]">
            Dedicated Sections:
          </span>
          <Link
            href="/hrms/performance/goals"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors"
          >
            <Target className="h-3.5 w-3.5 text-primary" />
            Goals Manager
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </Link>
          <span className="text-muted">•</span>
          <Link
            href="/hrms/performance/reviews"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-amber-500 transition-colors"
          >
            <Star className="h-3.5 w-3.5 text-amber-500" />
            Review Cycles
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </Link>
          <span className="text-muted">•</span>
          <Link
            href="/hrms/performance/kpis"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-emerald-500 transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
            KPI Metrics
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </Link>
          <span className="text-muted">•</span>
          <Link
            href="/hrms/performance/feedback"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-sky-500 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
            360 Feedback
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </Link>
        </div>

        <span className="text-xs text-muted">
          Updated live from company performance records
        </span>
      </div>

      {/* ── Main Tabbed Hub ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            {isManager ? "Team Performance" : "Employee Performance"}
            <span className="ml-1 rounded-full bg-primary/10 text-primary px-2 py-0.2 text-[10px] font-bold">
              {scopedUsers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            {isManager ? "Team Goals" : "All Goals & Milestones"}
            <span className="ml-1 rounded-full bg-muted text-muted-foreground px-2 py-0.2 text-[10px] font-bold">
              {scopedGoals.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Employee Performance Directory */}
        <TabsContent value="employees" className="focus-visible:outline-none">
          <EmployeePerformanceTab
            summaries={employeeSummaries}
            overview={teamOverview}
            loading={loading}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* TAB 2: Goals Table */}
        <TabsContent value="goals" className="focus-visible:outline-none space-y-4">
          <DataTable
            columns={goalColumns}
            data={scopedGoals}
            searchable
            searchPlaceholder="Search goals by title or employee..."
            searchKeys={["title", "userId"]}
            defaultPageSize={10}
            striped
            stickyHeader
            loading={loading}
            error={error}
            onRetry={fetchData}
            emptyMessage="No goals created yet. Click 'Add Goal' above to create the first goal."
            showEntriesSelector
            showRecordCount
            skeletonRows={5}
            ariaLabel="Performance goals table"
          />
        </TabsContent>
      </Tabs>

      {/* ── Add Goal Dialog ── */}
      <Dialog
        open={showAddGoalDialog}
        onOpenChange={(open) => {
          if (!open && !mutation.loading) {
            setShowAddGoalDialog(false);
            resetGoalForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Add New Goal</DialogTitle>
                <DialogDescription>
                  Assign a performance or development goal to an employee.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddGoal();
            }}
          >
            <div className="space-y-5 px-0.5">
              <FormSection title="Goal Details" columns={2} gradient>
                <FormInput
                  label="Goal Title"
                  icon={<Target className="h-4 w-4" />}
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="e.g. Increase test coverage to 85%"
                  required
                />

                {userSelectOptions.length > 0 ? (
                  <FormSelect
                    label="Assign to Employee"
                    icon={<Users className="h-4 w-4" />}
                    value={goalForm.employee}
                    onChange={(e) => setGoalForm({ ...goalForm, employee: e.target.value })}
                    options={[
                      { value: "", label: "Select an employee" },
                      ...userSelectOptions,
                    ]}
                    required
                  />
                ) : (
                  <FormInput
                    label="Employee ID or Name"
                    icon={<Users className="h-4 w-4" />}
                    value={goalForm.employee}
                    onChange={(e) => setGoalForm({ ...goalForm, employee: e.target.value })}
                    placeholder="Enter employee ID or name"
                    required
                  />
                )}

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
                  label="Description & Outcomes"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe measurable deliverables and success criteria..."
                />
              </FormSection>
            </div>

            <FormActions
              onCancel={() => {
                setShowAddGoalDialog(false);
                resetGoalForm();
              }}
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
