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

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Smart SWR Soft Refresh: Every 60s (eliminates aggressive 10s database churn)
    const interval = setInterval(() => {
      fetchDashboardSummary(true);
    }, 60000);

    // Revalidate on window focus
    const onFocus = () => fetchDashboardSummary(true);
    window.addEventListener("focus", onFocus);

    // Revalidate on local attendance punch updates
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

  return (
    <AppShell title="Manager Dashboard">
      {/* ── 1. Header Banner & Team Stats ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Team Operations Center
              </h2>
              <Badge variant="outline" className="text-xs font-semibold">
                {manager?.department || "Department Overview"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Supervising direct reports, attendance punctuality, and multi-module approval queues.
            </p>

            <div className="flex items-center gap-2.5 mt-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/50 border border-border/60 font-semibold text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" /> {overview.totalTeam} Direct Reports
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {presentToday} Present Today
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20 font-semibold text-orange-600 dark:text-orange-400">
                <Clock className="h-3.5 w-3.5" /> {data?.approvals?.totalPending || 0} Pending Approvals
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchDashboardSummary(false)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              Sync
            </Button>
            <Link href="/hrms/attendance">
              <Button size="sm" className="h-8 text-xs font-semibold rounded-xl">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Team Attendance
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. Manager's Own Punch In/Out ── */}
      <div className="mb-6">
        <AttendancePunchCard />
      </div>

      {/* ── 3. Attendance Exception Radar Banner ── */}
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

      {/* ── 4. Unified 4-in-1 Approval Hub ── */}
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

      {/* ── 5. Team Velocity & Review Gates ── */}
      <div className="mb-6">
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

      {/* ── 6. Real-Time Team Roster & AUX Status ── */}
      <div className="mb-6">
        <ManagerLiveRoster
          directReports={data?.directReports || []}
          teamOverview={overview}
          onRefresh={() => fetchDashboardSummary(false)}
          loading={refreshing}
        />
      </div>

      {/* ── 7. Visual Analytics & Attendance Graphs ── */}
      <TeamAnalytics
        liveEmployees={data?.directReports || []}
        liveSummary={overview}
        teamMembers={data?.directReports || []}
        presentToday={presentToday}
        departmentName={manager?.department}
      />
    </AppShell>
  );
}
