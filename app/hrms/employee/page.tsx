"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  ClipboardList,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Upload,
  Users,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  BarChart3,
  ChevronRight,
  Radio,
  Layers,
  HeartHandshake,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";
import { OnboardingCountdown } from "@/components/hr/onboarding-countdown";
import { DashboardQuickActions } from "@/components/employee/dashboard-quick-actions";
import { AccruedWageCard } from "@/components/employee/accrued-wage-card";
import { ShiftPunctualityCard } from "@/components/employee/shift-punctuality-card";
import { CultureKudosCard } from "@/components/employee/culture-kudos-card";

type EmployeeTab = "shift" | "finance" | "leaves" | "culture" | "all";

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EmployeeTab>("shift");

  // Document re-upload for rejected onboarding
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const fetchDashboardSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/hrm/v2/employee/dashboard-summary", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to load employee dashboard summary");
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary, user?.id]);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await fetch("/api/hrm/v2/onboarding/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      setUploadMsg("Document uploaded and submitted to HR for verification.");
      fetchDashboardSummary();
    } catch (e: any) {
      setUploadMsg(e?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadFile(null);
    }
  };

  const isVerified = Boolean(data?.user?.isVerified);
  const isRejected = Boolean(data?.user?.isRejected);
  const isPending = Boolean(data?.user?.isPending);
  const isPunchedIn = Boolean(data?.shift?.isPunchedIn);
  const accruedWage = data?.financial?.accruedWage || 0;
  const availableAdvance = data?.financial?.currentAvailableAdvance || 0;
  const leaveDaysRemaining = data?.leaveSummary?.totalRemaining || 0;

  return (
    <AppShell title="Employee Hub">
      {/* ── 1. Onboarding Status Banner (if rejected or pending) ── */}
      {isRejected && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 sm:p-5 mb-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">
                  Documents Rejected: Re-upload Required
                </h3>
                <p className="text-red-600 dark:text-red-300 mt-1">
                  Your onboarding documents were rejected by HR. Please re-upload within the 48-hour deadline.
                </p>
                <div className="mt-2">
                  <OnboardingCountdown
                    rejectionDate={new Date().toISOString()}
                    deadlineHours={48}
                    onExpired={() => {
                      fetch("/api/hrm/v2/onboarding/escalate", { method: "POST" });
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="doc-upload"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="doc-upload">
                <Button
                  asChild
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1 cursor-pointer"
                >
                  <span>
                    <Upload className="h-3.5 w-3.5" /> Upload Document
                  </span>
                </Button>
              </label>
              {uploadFile && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-primary text-white font-bold text-xs gap-1"
                >
                  {uploading ? "Uploading..." : "Submit"}
                </Button>
              )}
            </div>
          </div>
          {uploadMsg && <p className="text-xs font-semibold text-emerald-600 mt-2">{uploadMsg}</p>}
        </div>
      )}

      {isPending && !isRejected && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 mb-5 text-xs shadow-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-700 dark:text-amber-400 text-xs">
              Onboarding Review in Progress
            </h3>
            <p className="text-amber-600 dark:text-amber-300 text-[11px] mt-0.5">
              HR is reviewing your credentials. Advanced operations (salary advance and leave apply) unlock automatically once your Employee Code is issued.
            </p>
          </div>
        </div>
      )}

      {/* ═══ TIER 1: IDENTITY & QUICK ACTION BAR ═══ */}
      <div className="pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm shrink-0">
              {(user?.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-foreground tracking-tight truncate">
                  Welcome back, {user?.name?.split(" ")[0] || "Employee"}
                </h1>
                {isVerified && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold shrink-0">
                    {data?.user?.employeeCode || "Verified"}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {data?.user?.department || "Team"} &bull; Manager: {data?.user?.reportingManager || "Management"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardSummary()}
              disabled={loading}
              className="h-8 px-2.5 sm:px-3 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-2xs"
            >
              <Loader2 className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{loading ? "Syncing..." : "Sync"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions (Slide-Up Modals) */}
        <div className="mt-3">
          <DashboardQuickActions
            isVerified={isVerified}
            accrual={{
              accruedWage: data?.financial?.accruedWage || 0,
              currentAvailableAdvance: data?.financial?.currentAvailableAdvance || 0,
              maxAdvanceAllowed: data?.financial?.maxAdvanceAllowed || 0,
            }}
            onActionComplete={fetchDashboardSummary}
          />
        </div>
      </div>

      {/* ═══ TIER 2: STICKY SEGMENTED OPERATIONAL TABS ═══ */}
      <div className="sticky top-0 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-2.5 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-2xl border border-border/60 overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("shift")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "shift"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>Today&apos;s Shift</span>
            {isPunchedIn && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "finance"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            <span>Pay &amp; Advance</span>
          </button>

          <button
            onClick={() => setActiveTab("leaves")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "leaves"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
            <span>Leave Balances</span>
            {leaveDaysRemaining > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-white">
                {leaveDaysRemaining}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("culture")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "culture"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
            <span>Culture &amp; Kudos</span>
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

      {/* ═══ TIER 2B: 4 TACTILE EMPLOYEE KPI TILES ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        {/* Tile 1: Shift Status */}
        <div
          onClick={() => setActiveTab("shift")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Shift Status</span>
            <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${
              isPunchedIn ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span className={isPunchedIn ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              {isPunchedIn ? "On Duty" : "Not Punched"}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {data?.shift?.schedule || "10:00 AM – 07:00 PM"}
          </p>
        </div>

        {/* Tile 2: Accrued Wage */}
        <div
          onClick={() => setActiveTab("finance")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-blue-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Accrued Wage</span>
            <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-foreground tracking-tight flex items-center justify-between truncate">
            <span className="truncate">₹{accruedWage.toLocaleString("en-IN")}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            ₹{availableAdvance.toLocaleString("en-IN")} Advance ready
          </p>
        </div>

        {/* Tile 3: Leave Balance */}
        <div
          onClick={() => setActiveTab("leaves")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Leave Balance</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{leaveDaysRemaining} Days</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            Available to take
          </p>
        </div>

        {/* Tile 4: Culture & Kudos */}
        <div
          onClick={() => setActiveTab("culture")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-rose-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Culture &amp; Kudos</span>
            <div className="h-7 w-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{data?.culture?.recentKudos?.length || 0} Kudos</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            Team recognition &amp; events
          </p>
        </div>
      </div>

      {/* ═══ TIER 3: CONTEXTUAL WORKSPACES ═══ */}
      <div className="mt-5 space-y-6">
        {/* ─── TAB 1: TODAY'S SHIFT & PUNCH ─── */}
        {(activeTab === "shift" || activeTab === "all") && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <AttendancePunchCard />
            </div>

            <div>
              <ShiftPunctualityCard
                shift={
                  data?.shift || {
                    schedule: "10:00 AM – 07:00 PM (Mon – Sat)",
                    officeStart: "10:00 AM",
                    graceCutoff: "10:15 AM",
                    officeEnd: "07:00 PM",
                    isPunchedIn: false,
                    isPunchedOut: false,
                    punchInTime: null,
                    punchOutTime: null,
                    punctualityStatus: "not_checked_in",
                    lateMinutes: 0,
                    effectiveHours: 0,
                  }
                }
                attendanceHealth={
                  data?.attendanceHealth || {
                    daysPresent: 0,
                    lateMarksThisMonth: 0,
                    halfDaysThisMonth: 0,
                    maxAllowedLateMarks: 3,
                  }
                }
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: PAY & SALARY ADVANCE ─── */}
        {(activeTab === "finance" || activeTab === "all") && (
          <div>
            <AccruedWageCard
              accruedWage={accruedWage}
              currentAvailableAdvance={availableAdvance}
              monthlyGross={data?.financial?.monthlyGross || 50000}
              isVerified={isVerified}
              onOpenAdvanceModal={() => {
                const btn = document.querySelector('button:has(svg.text-emerald-500)') as HTMLButtonElement;
                btn?.click();
              }}
            />
          </div>
        )}

        {/* ─── TAB 3: LEAVE BALANCES ─── */}
        {(activeTab === "leaves" || activeTab === "all") && (
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">
                    Annual Leave Balances
                  </h3>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {leaveDaysRemaining} total days remaining for the calendar year
                  </span>
                </div>
              </div>

              <Link
                href="/hrms/leaves"
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                Apply for Leave <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(data?.leaveSummary?.balances || []).length === 0 ? (
                <div className="col-span-3 p-6 text-center border border-dashed border-border/70 rounded-xl text-muted-foreground text-xs">
                  No leave policy assigned to your profile. Contact HR.
                </div>
              ) : (
                (data?.leaveSummary?.balances || []).map((b: any) => (
                  <div
                    key={b.type}
                    className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 text-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-foreground font-bold capitalize text-xs">
                        {b.type} Leave
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {b.remaining} left
                      </span>
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${b.total > 0 ? Math.min(100, Math.round((b.used / b.total) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>Used: {b.used}</span>
                      <span>Total: {b.total}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Sandwich policy active on weekends</span>
              <span className="font-medium text-foreground">Standard 6-Day Work Week</span>
            </div>
          </div>
        )}

        {/* ─── TAB 4: CULTURE & KUDOS ─── */}
        {(activeTab === "culture" || activeTab === "all") && (
          <div>
            <CultureKudosCard
              culture={
                data?.culture || {
                  kudosBudget: 100,
                  remainingPointsToGive: 100,
                  recentKudosReceived: [],
                }
              }
              upcomingHoliday={data?.upcomingHoliday || null}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}
