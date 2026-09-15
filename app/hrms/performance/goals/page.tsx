"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Target,
  Search,
  Plus,
  Users,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

// ── Types ───────────────────────────────────────────────

interface GoalItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "in_progress" | "achieved" | "partially_achieved" | "not_achieved";
  progress: number;
  targetDate?: string;
}

interface UserOption {
  id: string;
  displayName?: string;
  email?: string;
}

const statusBadge: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "info",
  in_progress: "primary",
  achieved: "success",
  partially_achieved: "warning",
  not_achieved: "danger",
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
  userId: "",
  category: "performance",
  priority: "medium",
  targetDate: "",
  description: "",
};

export default function GoalsPage() {
  const [search, setSearch] = useState("");
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);

  const mutation = useMutation();
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=goals"),
        fetch("/api/hrm/v2/users?action=list"),
      ]);
      const goalsData = goalsRes.ok ? await goalsRes.json() : { data: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
      const users = (usersData.data || []) as UserOption[];
      setGoals(goalsData.data || []);
      setUserOptions(users);
      setUserNames(Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id])));
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nameOf = (id: string) => userNames[id] || id || "—";

  const handleAddGoal = async () => {
    if (!goalForm.title.trim()) return;
    const result = await mutation.createRecord("/api/hrm/v2/performance", {
      action: "create_goal",
      title: goalForm.title,
      userId: goalForm.userId || undefined,
      category: goalForm.category,
      priority: goalForm.priority,
      targetDate: goalForm.targetDate || undefined,
      description: goalForm.description,
    });
    if (result) {
      setShowAddDialog(false);
      setGoalForm(EMPTY_GOAL_FORM);
      fetchData();
      toast.success("Goal created", `"${goalForm.title}" has been added successfully.`);
    } else {
      toast.error("Create failed", mutation.error || "Please try again.");
    }
  };

  const filtered = goals.filter((g) => {
    const q = search.toLowerCase();
    return !search || g.title.toLowerCase().includes(q) || nameOf(g.userId).toLowerCase().includes(q);
  });

  return (
    <AppShell title="Goals">
      {/* Toasts */}
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              description={t.description}
              onClose={() => toast.dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="Goals" description="Manage and track employee goals and OKRs.">
        <Button onClick={() => { setGoalForm(EMPTY_GOAL_FORM); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </PageHeader>

      {/* Add Goal Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
            <DialogDescription>Create a new goal for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddGoal(); }}>
          <div className="space-y-4">
            <FormInput
              label="Title"
              value={goalForm.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, title: e.target.value })}
              placeholder="e.g. Improve response time"
              required
            />
            <FormSelect
              label="Employee"
              options={[{ value: "", label: "Select employee" }, ...userOptions.map((u) => ({ value: u.id, label: u.displayName || u.email || u.id }))]}
              value={goalForm.userId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGoalForm({ ...goalForm, userId: e.target.value })}
            />
            <FormSelect
              label="Category"
              options={[
                { value: "performance", label: "Performance" },
                { value: "development", label: "Development" },
                { value: "career", label: "Career" },
                { value: "personal", label: "Personal" },
              ]}
              value={goalForm.category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGoalForm({ ...goalForm, category: e.target.value })}
            />
            <FormSelect
              label="Priority"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ]}
              value={goalForm.priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGoalForm({ ...goalForm, priority: e.target.value })}
            />
            <FormInput
              label="Target Date"
              type="date"
              value={goalForm.targetDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
            />
            <FormTextarea
              label="Description"
              value={goalForm.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoalForm({ ...goalForm, description: e.target.value })}
              placeholder="Describe the goal and how success is measured..."
            />
            <FormActions
              onCancel={() => setShowAddDialog(false)}
              submitLabel="Create Goal"
              loading={mutation.loading}
            />
          </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search goals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted">Loading goals...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Target className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No goals found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((goal, idx) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-dark dark:text-white">{goal.title}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />{nameOf(goal.userId)}
                      </span>
                      <span className="text-xs text-muted">{goal.category}</span>
                      {goal.targetDate && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{goal.targetDate}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2 max-w-xs">
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
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    goal.priority === "critical" ? "bg-danger/10 text-danger" :
                    goal.priority === "high" ? "bg-warning/10 text-warning" :
                    goal.priority === "medium" ? "bg-primary/10 text-primary" :
                    "bg-gray-100 dark:bg-gray-800 text-muted"
                  }`}>
                    {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                  </span>
                  <Badge variant={statusBadge[goal.status] || "info"} size="sm">
                    <span className="flex items-center gap-1">
                      {statusIcons[goal.status]}
                      {goal.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
