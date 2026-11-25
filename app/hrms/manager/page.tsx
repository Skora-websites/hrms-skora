"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Shield,
  CalendarDays,
  Receipt,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Radio,
  FileCheck,
  Layers,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { TeamAnalytics } from "@/components/manager/team-analytics";
import { ManagerExceptionsRadar } from "@/components/manager/manager-exceptions-radar";
import { ManagerApprovalHub } from "@/components/manager/manager-approval-hub";
import { ManagerTeamVelocity } from "@/components/manager/manager-team-velocity";
import { ManagerLiveRoster } from "@/components/manager/manager-live-roster";

type ManagerTab = "overview" | "pulse" | "approvals" | "velocity" | "analytics" | "all";

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");

  const fetchDashboardSummary = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch("/api/hrm/v2/manager/dashboard-summary", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load manager dashboard summary");
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardSummary();

    // Smart SWR Soft Refresh: Every 60s
    const interval = setInterval(() => {
      fetchDashboardSummary(true);
    }, 60000);

    const onFocus = () => fetchDashboardSummary(true);
    window.addEventListener("focus", onFocus);

    const onPunch = () => fetchDashboardSummary(true);
    window.addEventListener("attendance-updated", onPunch);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("attendance-updated", onPunch);
    };
  }, [fetchDashboardSummary]);

  const manager = data?.manager;
  const overview = data?.teamOverview || {
    totalTeam: 0,
    punchedIn: 0,
    active: 0,
    onBreak: 0,
    inMeeting: 0,
    punchedOut: 0,
    absent: 0,
    inOffice: 0,
    remote: 0,
  };

  const presentToday = overview.punchedIn;
  const pendingApprovalsCount = data?.approvals?.totalPending || 0;
  const exceptionsCount = data?.exceptionsRadar?.totalExceptions || 0;

  return (
    <AppShell title="Manager Operations Center">
      {/* ═══ TIER 1: IDENTITY & RAPID ACTION BAR ═══ */}
      <div className="pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm shrink-0">
              {(user?.name || "M").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-foreground tracking-tight truncate">
                  Welcome back, {user?.name?.split(" ")[0] || "Manager"}
                </h1>
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold shrink-0">
                  {manager?.department || user?.department || "Operations"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Supervising direct reports, attendance punctuality &amp; approval queues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardSummary(false)}
              disabled={refreshing}
              className="h-8 px-2.5 sm:px-3 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Syncing..." : "Sync"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Action Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 mt-3">
          <Link href="/hrms/attendance" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Team Attendance</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/hrms/manager/my-team" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Direct Reports ({overview.totalTeam})</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <button
            onClick={() => setActiveTab("approvals")}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs"
          >
            <FileCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Pending Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═══ TIER 2: STICKY SEGMENTED OPERATIONAL TABS ═══ */}
      <div className="sticky top-0 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-2.5 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-2xl border border-border/60 overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "overview"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("pulse")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "pulse"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Team Pulse</span>
            {presentToday > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("approvals")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "approvals"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck className="h-3.5 w-3.5 text-amber-500" />
            <span>Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("velocity")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "velocity"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <span>Team Velocity</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-purple-500" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>All Cards</span>
          </button>
        </div>
      </div>

      {/* ═══ TIER 2B: 4 TACTILE OPERATIONAL KPI TILES ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        {/* Tile 1: Direct Reports */}
        <div
          onClick={() => setActiveTab("pulse")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Direct Reports</span>
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{overview.totalTeam}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {manager?.department || "Department roster"}
          </p>
        </div>

        {/* Tile 2: Present Today */}
        <div
          onClick={() => setActiveTab("pulse")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Present Today</span>
            <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center justify-between">
            <span>{presentToday}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {overview.inOffice} Office &bull; {overview.remote} Remote
          </p>
        </div>

        {/* Tile 3: Pending Approvals */}
        <div
          onClick={() => setActiveTab("approvals")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Pending Approvals</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{pendingApprovalsCount}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            Leaves, Claims, Overtime
          </p>
        </div>

        {/* Tile 4: Shift Exceptions */}
        <div
          onClick={() => setActiveTab("pulse")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-rose-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Shift Exceptions</span>
            <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{exceptionsCount}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {exceptionsCount === 0 ? "0 Punctuality flags" : `${exceptionsCount} Late / Drift marks`}
          </p>
        </div>
      </div>

      {/* ═══ TIER 3: CONTEXTUAL WORKSPACES (Progressive Disclosure) ═══ */}
      <div className="mt-5 space-y-6">
        {/* ─── TAB 1: OVERVIEW (Daily Manager Command Hub) ─── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Split Row: Personal Punch Card + Live Status Pulse */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Personal Punch Clock */}
              <div className="lg:col-span-1">
                <AttendancePunchCard />
              </div>

              {/* Team Live Roster Pulse Snapshot */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Radio className="h-4 w-4 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Team Presence Snapshot</h3>
                        <p className="text-[11px] text-muted-foreground">Real-time attendance &amp; AUX states</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("pulse")}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                    >
                      <span>Full Roster</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Presence Chips Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {overview.punchedIn}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">On Duty</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                        {overview.active}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Active AUX</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                        {overview.onBreak}
                      </div>
                      <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">On Break</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                        {overview.absent}
                      </div>
                      <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">Absent</div>
                    </div>
                  </div>

                  {/* Mini Team Roster Rows */}
                  <div className="space-y-1.5">
                    {(data?.directReports || []).slice(0, 3).map((emp: any, idx: number) => (
                      <div
                        key={emp.userId || emp.id || emp._id || emp.email || `emp-${idx}`}
                        className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-muted/20 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-foreground truncate block">{emp.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {emp.designation || emp.role}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                            emp.status === "punched_in"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {emp.status === "punched_in" ? "On Duty" : "Absent"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Location Split:</span>
                  <span className="font-semibold text-foreground">
                    {overview.inOffice} In-Office &bull; {overview.remote} Remote
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Exceptions Radar (if exceptions exist) */}
            {exceptionsCount > 0 && (
              <ManagerExceptionsRadar
                exceptions={
                  data?.exceptionsRadar || {
                    totalExceptions: 0,
                    lateMarks: [],
                    driftExceptions: [],
                    unclosedPunches: [],
                  }
                }
              />
            )}

            {/* Quick Action: Pending Approvals Hub Preview */}
            <div className="p-5 rounded-2xl border border-border/80 bg-card shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Approvals Clearance Gate</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Leaves, Attendance Regularizations, Overtime &amp; Expenses
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("approvals")}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                >
                  <span>Open Hub ({pendingApprovalsCount})</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {pendingApprovalsCount === 0 ? (
                <div className="p-6 text-center border border-dashed border-border/70 rounded-xl bg-muted/20 text-xs">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                  <span className="font-bold text-foreground block">Queue Clear</span>
                  <span className="text-[11px] text-muted-foreground">
                    All direct reports&apos; requests have been processed.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Leaves</span>
                    <span className="text-base font-bold text-foreground">
                      {data?.approvals?.leaveCount || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Regularizations</span>
                    <span className="text-base font-bold text-foreground">
                      {data?.approvals?.regularizationCount || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Overtime</span>
                    <span className="text-base font-bold text-foreground">
                      {data?.approvals?.overtimeCount || 0}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Expenses</span>
                    <span className="text-base font-bold text-foreground">
                      {data?.approvals?.expenseCount || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: TEAM PULSE & LIVE ROSTER ─── */}
        {(activeTab === "pulse" || activeTab === "all") && (
          <div className="space-y-6">
            <ManagerExceptionsRadar
              exceptions={
                data?.exceptionsRadar || {
                  totalExceptions: 0,
                  lateMarks: [],
                  driftExceptions: [],
                  unclosedPunches: [],
                }
              }
            />

            <ManagerLiveRoster
              directReports={data?.directReports || []}
              teamOverview={overview}
              onRefresh={() => fetchDashboardSummary(false)}
              loading={refreshing}
            />
          </div>
        )}

        {/* ─── TAB 3: APPROVALS HUB ─── */}
        {(activeTab === "approvals" || activeTab === "all") && (
          <div>
            <ManagerApprovalHub
              approvals={
                data?.approvals || {
                  totalPending: 0,
                  leaveCount: 0,
                  regularizationCount: 0,
                  overtimeCount: 0,
                  expenseCount: 0,
                  items: [],
                }
              }
              onRefresh={() => fetchDashboardSummary(true)}
            />
          </div>
        )}

        {/* ─── TAB 4: VELOCITY & REVIEWS ─── */}
        {(activeTab === "velocity" || activeTab === "all") && (
          <div>
            <ManagerTeamVelocity
              velocity={
                data?.teamVelocity || {
                  pending360ReviewsCount: 0,
                  probationApproachingCount: 0,
                  teamKpiCompletionRate: 85,
                }
              }
            />
          </div>
        )}

        {/* ─── TAB 5: ANALYTICS & ATTENDANCE GRAPHS ─── */}
        {(activeTab === "analytics" || activeTab === "all") && (
          <div>
            <TeamAnalytics
              liveEmployees={data?.directReports || []}
              liveSummary={overview}
              teamMembers={data?.directReports || []}
              presentToday={presentToday}
              departmentName={manager?.department}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
