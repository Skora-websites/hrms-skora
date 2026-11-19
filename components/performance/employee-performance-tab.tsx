"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import {
  Search,
  Users,
  Award,
  Star,
  TrendingUp,
  LayoutGrid,
  List,
  Eye,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EmployeePerformanceSummary,
  TeamPerformanceOverview,
  PerformanceTier,
} from "@/lib/performance/performance-calculator";
import { EmployeeDetailDrawer } from "./employee-detail-drawer";

interface EmployeePerformanceTabProps {
  summaries: EmployeePerformanceSummary[];
  overview: TeamPerformanceOverview;
  loading: boolean;
  onRefresh?: () => void;
}

const tierBadgeVariant: Record<PerformanceTier, "success" | "primary" | "warning" | "danger" | "info"> = {
  "Top Performer": "success",
  "Strong Performer": "primary",
  "On Track": "warning",
  "Needs Guidance": "danger",
  "Pending Evaluation": "info",
};

export function EmployeePerformanceTab({
  summaries,
  overview,
  loading,
}: EmployeePerformanceTabProps) {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name_asc" | "goals_desc">("score_desc");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showCharts, setShowCharts] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformanceSummary | null>(null);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const s of summaries) {
      if (s.user.department) set.add(s.user.department);
    }
    return Array.from(set).sort();
  }, [summaries]);

  // Filtered and sorted summaries
  const filteredSummaries = useMemo(() => {
    let result = [...summaries];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => {
        const name = (s.user.displayName || s.user.name || "").toLowerCase();
        const email = (s.user.email || "").toLowerCase();
        const dept = (s.user.department || "").toLowerCase();
        const desig = (s.user.designation || "").toLowerCase();
        return name.includes(q) || email.includes(q) || dept.includes(q) || desig.includes(q);
      });
    }

    // Department filter
    if (selectedDept !== "all") {
      result = result.filter((s) => s.user.department === selectedDept);
    }

    // Tier filter
    if (selectedTier !== "all") {
      result = result.filter((s) => s.tier === selectedTier);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "score_desc") {
        const sa = a.compositeScore ?? -1;
        const sb = b.compositeScore ?? -1;
        return sb - sa;
      }
      if (sortBy === "score_asc") {
        const sa = a.compositeScore ?? 999;
        const sb = b.compositeScore ?? 999;
        return sa - sb;
      }
      if (sortBy === "goals_desc") {
        return (b.avgGoalProgress ?? -1) - (a.avgGoalProgress ?? -1);
      }
      const nameA = a.user.displayName || a.user.name || a.user.email || "";
      const nameB = b.user.displayName || b.user.name || b.user.email || "";
      return nameA.localeCompare(nameB);
    });

    return result;
  }, [summaries, search, selectedDept, selectedTier, sortBy]);

  // Tier chart data
  const tierChartData = useMemo(() => {
    return overview.tierDistribution.map((t) => ({
      name: t.tier.replace(" Performer", "").replace(" Evaluation", ""),
      count: t.count,
      fill: t.color,
    }));
  }, [overview.tierDistribution]);

  // Dimension comparison chart data
  const dimensionChartData = useMemo(() => {
    const avgGoal = overview.totalGoals > 0
      ? Math.round((overview.achievedGoals / overview.totalGoals) * 100)
      : 0;
    const avgScore = overview.averageCompositeScore;
    const avgReview = overview.averageRating * 20; // convert 5-star to 100%

    return [
      { name: "Overall Score", value: avgScore, fill: "#6366f1" },
      { name: "Goal Achieved", value: avgGoal, fill: "#3b82f6" },
      { name: "Review Rating", value: avgReview, fill: "#f59e0b" },
    ];
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* ── Top Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Evaluated Employees</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {overview.evaluatedEmployees}
                </span>
                <span className="text-xs text-muted">/ {overview.totalEmployees} total</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted flex items-center gap-1">
            <span className="text-primary font-medium">
              {overview.totalEmployees > 0
                ? Math.round((overview.evaluatedEmployees / overview.totalEmployees) * 100)
                : 0}
              %
            </span>{" "}
            coverage rate
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Average Performance</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {overview.averageCompositeScore}%
                </span>
                <span className="text-xs font-medium text-amber-500 flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400" />
                  {overview.averageRating}/5
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted">
            Company-wide composite metric
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Top Performers</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {overview.topPerformersCount}
                </span>
                <span className="text-xs text-muted">
                  + {overview.strongPerformersCount} strong
                </span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {overview.evaluatedEmployees > 0
                ? Math.round(
                    ((overview.topPerformersCount + overview.strongPerformersCount) /
                      overview.evaluatedEmployees) *
                      100
                  )
                : 0}
              %
            </span>{" "}
            meeting high standard
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted">Needs Attention</p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-foreground">
                  {overview.needsGuidanceCount}
                </span>
                <span className="text-xs text-muted">guidance needed</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-xs text-muted">
            {overview.pendingCount} pending initial evaluation
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Section ── */}
      {showCharts && isMounted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: Performance Tier Distribution */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Performance Distribution</h3>
                <p className="text-xs text-muted">Employees across talent tiers</p>
              </div>
              <Badge variant="subtle" size="sm">
                {overview.totalEmployees} Team Members
              </Badge>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {tierChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Dimension Benchmarks */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Key Dimension Averages</h3>
                <p className="text-xs text-muted">Normalized benchmark percentages</p>
              </div>
              <Badge variant="subtle" size="sm">
                Targets vs Actuals
              </Badge>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dimensionChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted"
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    className="text-muted"
                    width={100}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [`${String(val)}%`, "Average"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {dimensionChartData.map((entry, index) => (
                      <Cell key={`dim-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters and Controls Bar ── */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department Select */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Tier Select */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="all">All Tiers</option>
              <option value="Top Performer">Top Performer (90%+)</option>
              <option value="Strong Performer">Strong Performer (75-89%)</option>
              <option value="On Track">On Track (60-74%)</option>
              <option value="Needs Guidance">Needs Guidance (&lt;60%)</option>
              <option value="Pending Evaluation">Pending Evaluation</option>
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "score_desc" | "score_asc" | "name_asc" | "goals_desc"
                )
              }
              className="px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="score_desc">Score: High to Low</option>
              <option value="score_asc">Score: Low to High</option>
              <option value="goals_desc">Goal Progress</option>
              <option value="name_asc">Name: A to Z</option>
            </select>

            {/* Table / Grid view toggles */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
                aria-label="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Charts toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCharts(!showCharts)}
              className="text-xs h-9"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              {showCharts ? "Hide Charts" : "Show Charts"}
            </Button>
          </div>
        </div>

        {/* Active Filters count */}
        <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/50">
          <span>
            Showing <strong className="text-foreground">{filteredSummaries.length}</strong> of{" "}
            {summaries.length} employees
          </span>
          {(search || selectedDept !== "all" || selectedTier !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedDept("all");
                setSelectedTier("all");
              }}
              className="text-primary hover:underline font-medium text-xs"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ── Employee Roster: Table View ── */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Employee
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Performance Score
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Goal Progress
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    KPI Achievement
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Review Rating
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Tier
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="motion-safe:animate-pulse">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-muted rounded" />
                            <div className="h-2 w-20 bg-muted rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-2 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-12 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-14 bg-muted rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-5 w-20 bg-muted rounded-full" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="h-7 w-20 bg-muted rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-semibold text-foreground">No employees found</p>
                        <p className="text-xs text-muted">
                          Try adjusting your search criteria or filter options above.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((s) => {
                    const name = s.user.displayName || s.user.name || s.user.email || "Employee";
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={s.user.id}
                        onClick={() => setSelectedEmployee(s)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      >
                        {/* Employee Details */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border shrink-0">
                              {s.user.avatar ? (
                                <AvatarImage src={s.user.avatar} alt={name} />
                              ) : null}
                              <AvatarFallback className="text-xs font-bold bg-gradient-primary text-white">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                {name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-muted truncate">
                                <span>{s.user.designation || "Team Member"}</span>
                                {s.user.department && (
                                  <>
                                    <span>•</span>
                                    <span>{s.user.department}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Composite Score */}
                        <td className="px-4 py-3.5">
                          {s.compositeScore !== null ? (
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-1">
                                <span className="font-extrabold text-foreground text-sm">
                                  {s.compositeScore}%
                                </span>
                                <span className="text-[10px] text-muted">
                                  ({s.compositeRating}/5)
                                </span>
                              </div>
                              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    s.compositeScore >= 90
                                      ? "bg-emerald-500"
                                      : s.compositeScore >= 75
                                      ? "bg-primary"
                                      : s.compositeScore >= 60
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${s.compositeScore}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted text-xs">Pending</span>
                          )}
                        </td>

                        {/* Goal Progress */}
                        <td className="px-4 py-3.5">
                          {s.goalsCount > 0 ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] text-muted">
                                <span>
                                  {s.goalsAchievedCount}/{s.goalsCount} achieved
                                </span>
                                <span className="font-semibold text-foreground">
                                  {s.avgGoalProgress}%
                                </span>
                              </div>
                              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${s.avgGoalProgress || 0}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted text-[11px]">No goals</span>
                          )}
                        </td>

                        {/* KPI Achievement */}
                        <td className="px-4 py-3.5">
                          {s.kpisCount > 0 ? (
                            <span
                              className={`font-semibold ${
                                (s.avgKpiAchievement || 0) >= 100
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : (s.avgKpiAchievement || 0) >= 70
                                  ? "text-primary"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {s.avgKpiAchievement}% target
                            </span>
                          ) : (
                            <span className="text-muted text-[11px]">No KPIs</span>
                          )}
                        </td>

                        {/* Review Rating */}
                        <td className="px-4 py-3.5">
                          {s.reviewsCount > 0 && s.avgReviewRating !== null ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-foreground">
                                {s.avgReviewRating}
                              </span>
                              <span className="text-muted text-[10px]">
                                ({s.reviewsCount})
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted text-[11px]">No reviews</span>
                          )}
                        </td>

                        {/* Tier */}
                        <td className="px-4 py-3.5">
                          <Badge variant={tierBadgeVariant[s.tier]} size="sm">
                            {s.tier}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployee(s);
                            }}
                            className="text-xs h-8 focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Employee Roster: Grid View ── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map((s) => {
            const name = s.user.displayName || s.user.name || s.user.email || "Employee";
            const initials = name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={s.user.id}
                onClick={() => setSelectedEmployee(s)}
                className="rounded-xl border border-border bg-card p-5 shadow-2xs hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-border">
                        {s.user.avatar ? (
                          <AvatarImage src={s.user.avatar} alt={name} />
                        ) : null}
                        <AvatarFallback className="font-bold bg-gradient-primary text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {name}
                        </h4>
                        <p className="text-xs text-muted truncate">
                          {s.user.designation || "Team Member"}
                        </p>
                        {s.user.department && (
                          <p className="text-[11px] text-muted truncate">
                            {s.user.department}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={tierBadgeVariant[s.tier]} size="sm">
                      {s.tier}
                    </Badge>
                  </div>

                  {/* Composite Score Meter */}
                  <div className="mt-4 rounded-lg bg-muted/30 p-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-semibold text-muted">
                        Composite Score
                      </span>
                      <span className="text-lg font-extrabold text-foreground">
                        {s.compositeScore !== null ? `${s.compositeScore}%` : "Pending"}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          (s.compositeScore || 0) >= 90
                            ? "bg-emerald-500"
                            : (s.compositeScore || 0) >= 75
                            ? "bg-primary"
                            : (s.compositeScore || 0) >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${s.compositeScore || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini Stats row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="rounded-lg bg-muted/20 p-2">
                      <p className="text-[10px] text-muted">Goals</p>
                      <p className="font-bold text-foreground">
                        {s.goalsAchievedCount}/{s.goalsCount}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/20 p-2">
                      <p className="text-[10px] text-muted">KPIs</p>
                      <p className="font-bold text-foreground">
                        {s.avgKpiAchievement !== null ? `${s.avgKpiAchievement}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/20 p-2">
                      <p className="text-[10px] text-muted">Rating</p>
                      <p className="font-bold text-foreground flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {s.avgReviewRating || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View Performance Profile
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over Drawer for Individual Employee ── */}
      <EmployeeDetailDrawer
        summary={selectedEmployee}
        open={selectedEmployee !== null}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
}
