"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Target,
  BarChart3,
  Star,
  Award,
  Calendar,
  Briefcase,
  Building,
  Mail,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { EmployeePerformanceSummary } from "@/lib/performance/performance-calculator";

interface EmployeeDetailDrawerProps {
  summary: EmployeePerformanceSummary | null;
  open: boolean;
  onClose: () => void;
}

const tierBadgeVariant: Record<string, "success" | "primary" | "warning" | "danger" | "info"> = {
  "Top Performer": "success",
  "Strong Performer": "primary",
  "On Track": "warning",
  "Needs Guidance": "danger",
  "Pending Evaluation": "info",
};

export function EmployeeDetailDrawer({
  summary,
  open,
  onClose,
}: EmployeeDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "goals" | "reviews" | "kpis" | "feedback">("overview");

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!summary) return null;

  const { user, compositeScore, compositeRating, tier, goals, reviews, kpis, feedbacks } = summary;
  const displayName = user.displayName || user.name || user.email || "Employee";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-card border-l border-border shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`${displayName} Performance Profile`}
          >
            {/* Header */}
            <div className="border-b border-border p-6 bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-xs">
                    {user.avatar ? <AvatarImage src={user.avatar} alt={displayName} /> : null}
                    <AvatarFallback className="text-base font-bold bg-gradient-primary text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                      <Badge variant={tierBadgeVariant[tier]} size="sm">
                        {tier}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted flex-wrap">
                      {user.designation && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {user.designation}
                        </span>
                      )}
                      {user.department && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {user.department}
                        </span>
                      )}
                      {user.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close performance drawer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Overall Score Highlight */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <p className="text-[11px] font-semibold text-muted">Composite Score</p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">
                      {compositeScore !== null ? `${compositeScore}%` : "Pending"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <p className="text-[11px] font-semibold text-muted">Rating Equiv.</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-2xl font-extrabold text-foreground">
                      {compositeRating !== null ? `${compositeRating}` : "0.0"}
                    </span>
                    <span className="text-xs text-muted">/ 5</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <p className="text-[11px] font-semibold text-muted">Goal Completion</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {summary.avgGoalProgress !== null ? `${summary.avgGoalProgress}%` : "None"}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <p className="text-[11px] font-semibold text-muted">KPI Achievement</p>
                  <p className="mt-1 text-2xl font-extrabold text-foreground">
                    {summary.avgKpiAchievement !== null ? `${summary.avgKpiAchievement}%` : "None"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs Header */}
            <div className="flex-1 overflow-y-auto p-6">
              <Tabs
                value={activeTab}
                onValueChange={(val) =>
                  setActiveTab(val as "overview" | "goals" | "reviews" | "kpis" | "feedback")
                }
              >
                <TabsList className="grid w-full grid-cols-5 mb-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
                  <TabsTrigger value="kpis">KPIs ({kpis.length})</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback ({feedbacks.length})</TabsTrigger>
                </TabsList>

                {/* TAB 1: Overview */}
                <TabsContent value="overview" className="space-y-5 focus-visible:outline-none">
                  {/* Performance Summary Matrix */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" />
                      Performance Dimensions
                    </h3>
                    <div className="space-y-4">
                      {/* Goals progress bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">Goals Tracked</span>
                          <span className="text-muted">
                            {summary.goalsAchievedCount} of {goals.length} achieved ({summary.avgGoalProgress || 0}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${summary.avgGoalProgress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* KPI progress bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">KPI Performance</span>
                          <span className="text-muted">
                            {summary.avgKpiAchievement || 0}% target achievement
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(summary.avgKpiAchievement || 0, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Review ratings */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">Review Ratings</span>
                          <span className="text-muted">
                            {summary.avgReviewRating ? `${summary.avgReviewRating} / 5.0` : "No reviews yet"}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${summary.avgReviewRating ? (summary.avgReviewRating / 5) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recent Goals summary */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-primary" /> Active Goals
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("goals")}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          View all
                        </button>
                      </div>
                      {goals.length === 0 ? (
                        <p className="text-xs text-muted py-3 text-center">No goals assigned yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {goals.slice(0, 3).map((g) => (
                            <div key={g.id} className="rounded-lg bg-muted/30 p-2 text-xs">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-foreground truncate max-w-[180px]">
                                  {g.title}
                                </span>
                                <span className="font-semibold text-primary">{g.progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${g.progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent KPIs summary */}
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5 text-emerald-500" /> Key Performance Indicators
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("kpis")}
                          className="text-[11px] text-primary hover:underline font-medium"
                        >
                          View all
                        </button>
                      </div>
                      {kpis.length === 0 ? (
                        <p className="text-xs text-muted py-3 text-center">No KPIs recorded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {kpis.slice(0, 3).map((k) => {
                            const pct = Math.round((k.actual / Math.max(k.target, 0.001)) * 100);
                            return (
                              <div key={k.id} className="rounded-lg bg-muted/30 p-2 text-xs">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-medium text-foreground truncate max-w-[160px]">
                                    {k.name || k.title || "KPI"}
                                  </span>
                                  <span className="text-muted">
                                    {k.actual} / {k.target} {k.unit} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-primary" : "bg-amber-500"
                                    }`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: Goals */}
                <TabsContent value="goals" className="space-y-3 focus-visible:outline-none">
                  {goals.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted text-xs">
                      No goals currently assigned to this employee.
                    </div>
                  ) : (
                    goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">{goal.title}</h4>
                            {goal.description && (
                              <p className="text-xs text-muted mt-1">{goal.description}</p>
                            )}
                          </div>
                          <Badge
                            variant={
                              goal.status === "achieved"
                                ? "success"
                                : goal.status === "in_progress"
                                ? "primary"
                                : "warning"
                            }
                            size="sm"
                          >
                            {goal.status.replace(/_/g, " ")}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span className="px-2 py-0.5 rounded bg-muted/50 font-medium">
                            Category: {goal.category}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-muted/50 font-medium">
                            Priority: {goal.priority}
                          </span>
                          {goal.targetDate && (
                            <span className="flex items-center gap-1 ml-auto">
                              <Calendar className="h-3 w-3" />
                              Target: {goal.targetDate}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted font-medium">Progress</span>
                            <span className="font-semibold text-foreground">{goal.progress}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 3: KPIs */}
                <TabsContent value="kpis" className="space-y-3 focus-visible:outline-none">
                  {kpis.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted text-xs">
                      No KPIs defined for this employee.
                    </div>
                  ) : (
                    kpis.map((kpi) => {
                      const achievementPct = Math.round(
                        (kpi.actual / Math.max(kpi.target, 0.001)) * 100
                      );
                      return (
                        <div
                          key={kpi.id}
                          className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                {kpi.name || kpi.title || "KPI Target"}
                              </h4>
                              {kpi.category && (
                                <p className="text-xs text-muted mt-0.5 capitalize">
                                  Category: {kpi.category}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                achievementPct >= 100
                                  ? "success"
                                  : achievementPct >= 70
                                  ? "primary"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {achievementPct}% Achieved
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center py-2 bg-muted/30 rounded-lg text-xs">
                            <div>
                              <p className="text-muted text-[10px]">Target</p>
                              <p className="font-bold text-foreground">
                                {kpi.target} {kpi.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted text-[10px]">Actual</p>
                              <p className="font-bold text-foreground">
                                {kpi.actual} {kpi.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted text-[10px]">Period</p>
                              <p className="font-bold text-foreground">{kpi.period || "Current"}</p>
                            </div>
                          </div>

                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                achievementPct >= 100
                                  ? "bg-emerald-500"
                                  : achievementPct >= 70
                                  ? "bg-primary"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(achievementPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                {/* TAB 4: Reviews */}
                <TabsContent value="reviews" className="space-y-4 focus-visible:outline-none">
                  {reviews.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted text-xs">
                      No performance reviews recorded for this employee yet.
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground capitalize">
                                {rev.period || "Annual"} Review
                              </span>
                              <Badge variant="subtle" size="sm">
                                {rev.reviewType || "manager"}
                              </Badge>
                            </div>
                            {rev.createdAt && (
                              <p className="text-[11px] text-muted mt-0.5">
                                Submitted on {new Date(rev.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 border border-amber-500/20">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-sm text-foreground">
                              {rev.overallRating || 0}
                            </span>
                            <span className="text-xs text-muted">/ 5</span>
                          </div>
                        </div>

                        {/* Category Scores */}
                        {rev.scores && rev.scores.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            {rev.scores.map((sc, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center rounded-lg bg-muted/40 p-2"
                              >
                                <span className="font-medium text-foreground">{sc.category}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  <span className="font-bold">{sc.score}/5</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Qualitative Notes */}
                        {rev.strengths && (
                          <div className="text-xs bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5">
                            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Strengths:
                            </p>
                            <p className="text-foreground mt-0.5">{rev.strengths}</p>
                          </div>
                        )}

                        {rev.areasForImprovement && (
                          <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
                            <p className="font-semibold text-amber-700 dark:text-amber-300">
                              Areas for Improvement:
                            </p>
                            <p className="text-foreground mt-0.5">{rev.areasForImprovement}</p>
                          </div>
                        )}

                        {rev.managerComments && (
                          <div className="text-xs bg-muted/40 rounded-lg p-2.5">
                            <p className="font-semibold text-foreground">Manager Comments:</p>
                            <p className="text-muted mt-0.5">{rev.managerComments}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 5: 360 Feedback */}
                <TabsContent value="feedback" className="space-y-3 focus-visible:outline-none">
                  {feedbacks.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted text-xs">
                      No feedback notes received for this employee yet.
                    </div>
                  ) : (
                    feedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                fb.type === "praise" || fb.feedbackType === "praise"
                                  ? "success"
                                  : "primary"
                              }
                              size="sm"
                            >
                              {fb.type || fb.feedbackType || "feedback"}
                            </Badge>
                            {fb.rating && (
                              <div className="flex items-center gap-0.5 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-amber-400" />
                                <span className="font-semibold">{fb.rating}/5</span>
                              </div>
                            )}
                          </div>
                          {fb.createdAt && (
                            <span className="text-[11px] text-muted">
                              {new Date(fb.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-foreground italic bg-muted/30 p-2.5 rounded-lg border-l-2 border-primary">
                          &ldquo;{fb.message || fb.feedback}&rdquo;
                        </p>

                        {fb.context && (
                          <p className="text-[11px] text-muted">Context: {fb.context}</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
