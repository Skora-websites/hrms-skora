"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  DollarSign,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Radio,
  FileCheck,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { HrStatutoryPayrollCard } from "@/components/hr/hr-statutory-payroll-card";
import { HrAttendanceRadar } from "@/components/hr/hr-attendance-radar";
import { HrLifecycleGate } from "@/components/hr/hr-lifecycle-gate";
import { HrIssueLetterModal } from "@/components/hr/hr-issue-letter-modal";

type HrTab = "overview" | "payroll" | "attendance" | "lifecycle" | "roster" | "all";

export default function HrAdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HrTab>("overview");

  // Modals
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showIssueLetter, setShowIssueLetter] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");

  // Add Employee Form State
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    employmentType: "permanent",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDashboardSummary = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await fetch("/api/hrm/v2/hr-admin/dashboard-summary", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load HR Admin summary");
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

    // 60-second SWR soft refresh interval
    const interval = setInterval(() => {
      fetchDashboardSummary(true);
    }, 60000);

    const onFocus = () => fetchDashboardSummary(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDashboardSummary]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      if (res.ok) {
        setShowAddEmployee(false);
        setNewEmployee({
          name: "",
          email: "",
          department: "",
          designation: "",
          employmentType: "permanent",
        });
        showToast("Employee added successfully.", "success");
        fetchDashboardSummary(true);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to add employee", "error");
      }
    } catch {
      showToast("Network error while adding employee", "error");
    } finally {
      setAddLoading(false);
    }
  };

  const headcount = data?.headcount || {
    totalEmployees: 0,
    activeEmployees: 0,
    pendingOnboardingCount: 0,
    probationCount: 0,
    departmentCounts: {},
  };

  const totalLifecyclePending =
    (data?.lifecycleClearance?.onboardingQueue?.length || 0) +
    (data?.lifecycleClearance?.probationConfirmations?.length || 0) +
    (data?.lifecycleClearance?.exitClearances?.length || 0) +
    (data?.lifecycleClearance?.managerApprovedExpenses?.length || 0);

  const filteredEmployees = (data?.recentEmployees || []).filter((emp: any) => {
    if (!searchEmployee) return true;
    const q = searchEmployee.toLowerCase();
    return (
      (emp.name || "").toLowerCase().includes(q) ||
      (emp.email || "").toLowerCase().includes(q) ||
      (emp.employeeCode || "").toLowerCase().includes(q) ||
      (emp.department || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="HR Command Center">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* ═══ TIER 1: STRATEGIC HR IDENTITY & ACTIONS BAR ═══ */}
      <div className="pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm shrink-0">
              {(user?.name || "H").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-foreground tracking-tight truncate">
                  Welcome back, {user?.name?.split(" ")[0] || "HR Admin"}
                </h1>
                <Badge variant="outline" className="text-[10px] sm:text-xs font-bold border-primary/30 text-primary shrink-0">
                  Strategic HR
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Headcount governance, statutory payroll &amp; employee lifecycle gates
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

        {/* Quick Actions Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 mt-3">
          <button
            onClick={() => setShowAddEmployee(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Employee</span>
          </button>

          <button
            onClick={() => setShowIssueLetter(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors shadow-2xs"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Issue Verified Letter</span>
          </button>

          <Link href="/hrms/hr-admin/payroll" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <span>Payroll Console</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/hrms/hr-admin/attendance" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              <span>Shift Attendance</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/hrms/hr-admin/onboarding" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <UserCheck className="h-3.5 w-3.5 text-amber-500" />
              <span>Onboarding ({headcount.pendingOnboardingCount})</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>
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
            onClick={() => setActiveTab("payroll")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "payroll"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            <span>Statutory Payroll</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "attendance"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Attendance Radar</span>
          </button>

          <button
            onClick={() => setActiveTab("lifecycle")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "lifecycle"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            <span>Lifecycle Clearances</span>
            {totalLifecyclePending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-white">
                {totalLifecyclePending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "roster"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 text-purple-500" />
            <span>Workforce Roster</span>
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
            <span>All Pillars</span>
          </button>
        </div>
      </div>

      {/* ═══ TIER 2B: 4 TACTILE HR METRIC TILES ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        {/* Tile 1: Total Staff */}
        <div
          onClick={() => setActiveTab("roster")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Total Staff</span>
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{headcount.totalEmployees}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {headcount.probationCount} in probation
          </p>
        </div>

        {/* Tile 2: On Duty Today */}
        <div
          onClick={() => setActiveTab("attendance")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">On Duty Today</span>
            <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center justify-between">
            <span>{data?.attendanceRadar?.punchedInToday || 0}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {data?.attendanceRadar?.inOfficeCount || 0} Office &bull; {data?.attendanceRadar?.remoteCount || 0} Remote
          </p>
        </div>

        {/* Tile 3: Estimated Gross Payout */}
        <div
          onClick={() => setActiveTab("payroll")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-blue-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Estimated Gross</span>
            <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between truncate">
            <span className="truncate">
              ₹{(data?.statutoryPayroll?.estimatedMonthlyGross || 0).toLocaleString("en-IN")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {data?.statutoryPayroll?.daysToPayrollCutoff || 0} days to cutoff
          </p>
        </div>

        {/* Tile 4: Lifecycle Clearances */}
        <div
          onClick={() => setActiveTab("lifecycle")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Lifecycle Actions</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{totalLifecyclePending}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {headcount.pendingOnboardingCount} Onboarding &bull; {headcount.probationCount} Probation
          </p>
        </div>
      </div>

      {/* ═══ TIER 3: CONTEXTUAL WORKSPACES (Progressive Disclosure) ═══ */}
      <div className="mt-5 space-y-6">
        {/* ─── TAB 1: OVERVIEW (Strategic Summary) ─── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Split Row: Personal Punch Card + Organization Presence Snapshot */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Personal Punch Clock */}
              <div className="lg:col-span-1">
                <AttendancePunchCard />
              </div>

              {/* Attendance & Shift Radar Snapshot */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Radio className="h-4 w-4 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Organization Presence Pulse</h3>
                        <p className="text-[11px] text-muted-foreground">Live workforce turnout &amp; shift compliance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("attendance")}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                    >
                      <span>Full Radar</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Turnout Metric Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {data?.attendanceRadar?.punchedInToday || 0}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Punched In</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                        {data?.attendanceRadar?.onTimeToday || 0}
                      </div>
                      <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">On Time</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                        {data?.attendanceRadar?.gracePeriodToday || 0}
                      </div>
                      <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Grace (15m)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                      <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                        {data?.attendanceRadar?.lateToday || 0}
                      </div>
                      <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">Late Marks</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Shift Policy: {data?.attendanceRadar?.shiftHours || "10:00 AM – 07:00 PM"}</span>
                  <span className="font-semibold text-foreground">
                    {headcount.totalEmployees > 0
                      ? `${Math.round(((data?.attendanceRadar?.punchedInToday || 0) / headcount.totalEmployees) * 100)}% Turnout`
                      : "0% Turnout"}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Row: Statutory Liabilities Snapshot + Lifecycle Clearance Action Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Statutory Micro Box */}
              <div
                onClick={() => setActiveTab("payroll")}
                className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-blue-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span className="font-bold text-xs text-foreground">Statutory Liabilities</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>EPFO Liability (13%):</span>
                    <span className="font-bold text-foreground">
                      ₹{(data?.statutoryPayroll?.employerPfLiability || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ESIC Liability (3.25%):</span>
                    <span className="font-bold text-foreground">
                      ₹{(data?.statutoryPayroll?.employerEsicLiability || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Compliance:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{(data?.statutoryPayroll?.totalStatutoryLiabilities || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lifecycle Clearance Micro Box */}
              <div
                onClick={() => setActiveTab("lifecycle")}
                className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-xs text-foreground">Lifecycle Gate Clearances</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Pending Onboarding:</span>
                    <span className="font-bold text-foreground">
                      {headcount.pendingOnboardingCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Probation Confirmations:</span>
                    <span className="font-bold text-foreground">
                      {headcount.probationCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Expense Clearances:</span>
                    <span className="font-bold text-foreground">
                      {data?.statutoryPayroll?.pendingExpenseCount || 0} (₹
                      {(data?.statutoryPayroll?.pendingExpensePayoutTotal || 0).toLocaleString("en-IN")})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STATUTORY PAYROLL & COMPLIANCE ─── */}
        {(activeTab === "payroll" || activeTab === "all") && (
          <div>
            <HrStatutoryPayrollCard
              payroll={
                data?.statutoryPayroll || {
                  currentPeriod: "2026-11",
                  daysToPayrollCutoff: 11,
                  estimatedMonthlyGross: 0,
                  employerPfLiability: 0,
                  employerEsicLiability: 0,
                  projectedTdsWithholding: 0,
                  estimatedPtLiability: 0,
                  totalStatutoryLiabilities: 0,
                  pendingExpensePayoutTotal: 0,
                  pendingExpenseCount: 0,
                }
              }
            />
          </div>
        )}

        {/* ─── TAB 3: ATTENDANCE RADAR ─── */}
        {(activeTab === "attendance" || activeTab === "all") && (
          <div>
            <HrAttendanceRadar
              radar={
                data?.attendanceRadar || {
                  shiftHours: "10:00 AM – 07:00 PM (Mon – Sat)",
                  punchedInToday: 0,
                  onTimeToday: 0,
                  gracePeriodToday: 0,
                  lateToday: 0,
                  absentToday: 0,
                  inOfficeCount: 0,
                  remoteCount: 0,
                  unclosedPreviousPunches: 0,
                }
              }
              totalEmployees={headcount.totalEmployees}
            />
          </div>
        )}

        {/* ─── TAB 4: LIFECYCLE CLEARANCE GATE ─── */}
        {(activeTab === "lifecycle" || activeTab === "all") && (
          <div>
            <HrLifecycleGate
              lifecycle={
                data?.lifecycleClearance || {
                  onboardingQueue: [],
                  probationConfirmations: [],
                  exitClearances: [],
                  managerApprovedExpenses: [],
                }
              }
              onRefresh={() => fetchDashboardSummary(true)}
            />
          </div>
        )}

        {/* ─── TAB 5: WORKFORCE ROSTER ─── */}
        {(activeTab === "roster" || activeTab === "all") && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Workforce Roster Overview ({filteredEmployees.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Direct access to company employees, departments, and employee codes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
                  />
                </div>

                <Link href="/hrms/hr-admin/employees">
                  <Button size="sm" variant="outline" className="h-8 text-xs font-semibold rounded-xl">
                    Full Directory <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
                No employees match your search criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredEmployees.map((emp: any) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-1 text-xs hover:border-border transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground truncate">{emp.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {emp.employeeCode}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {emp.designation} &bull; {emp.department}
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span>Manager: {emp.reportingManager}</span>
                      <span className="font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                        {emp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Employee Modal ── */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 space-y-4 text-foreground shadow-2xl">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Add New Employee
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@skora.in"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="Engineering"
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="Senior Developer"
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Employment Type</label>
                <select
                  value={newEmployee.employmentType}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employmentType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="permanent">Permanent Staff</option>
                  <option value="probation">Probation (90 Days)</option>
                  <option value="contract">Contractor</option>
                  <option value="intern">Intern</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddEmployee(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addLoading} className="bg-primary text-white font-semibold">
                  {addLoading ? "Creating..." : "Create Employee Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Issue Verified Letter Modal ── */}
      <HrIssueLetterModal
        open={showIssueLetter}
        onOpenChange={setShowIssueLetter}
        employees={data?.recentEmployees || []}
        onLetterIssued={() => fetchDashboardSummary(true)}
      />
    </AppShell>
  );
}
