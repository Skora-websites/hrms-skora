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

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AppShell title="Employee Hub">
      {/* ── 1. Onboarding Status Banner ── */}
      {isRejected && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-5 mb-5 text-xs">
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

      {isVerified && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mb-5 text-xs shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                    Employee Code
                  </span>
                  <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                    {data?.user?.employeeCode || "Verified"}
                  </span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-emerald-500/20" />
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                    Department
                  </span>
                  <span className="font-semibold text-foreground">
                    {data?.user?.department || "General"}
                  </span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-emerald-500/20" />
                <div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                    Reporting Manager
                  </span>
                  <span className="font-semibold text-foreground">
                    {data?.user?.reportingManager || "Management"}
                  </span>
                </div>
              </div>
            </div>

            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] self-start sm:self-auto">
              Active & Verified
            </Badge>
          </div>
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

      {/* ── 2. Quick Action Pills (Slide-Up Modals) ── */}
      <div className="mb-5">
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

      {/* ── 3. Action Hub: Attendance Punch Card ── */}
      <div className="mb-6">
        <AttendancePunchCard />
      </div>

      {/* ── 4. Core 4-Card Operational Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Real-Time Accrued Wage (EWA) */}
        <AccruedWageCard
          accruedWage={data?.financial?.accruedWage || 0}
          currentAvailableAdvance={data?.financial?.currentAvailableAdvance || 0}
          monthlyGross={data?.financial?.monthlyGross || 50000}
          isVerified={isVerified}
          onOpenAdvanceModal={() => {
            const btn = document.querySelector('button:has(svg.text-emerald-500)') as HTMLButtonElement;
            btn?.click();
          }}
        />

        {/* Card 2: Shift & Punctuality Engine */}
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

        {/* Card 3: Leave Balances Breakdown */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-tight">
                    Leave Balances
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Total: {data?.leaveSummary?.totalRemaining || 0} days remaining
                  </span>
                </div>
              </div>

              <Link
                href="/hrms/leaves"
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
              >
                Apply <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-2 mt-2">
              {(data?.leaveSummary?.balances || []).length === 0 ? (
                <div className="p-3 text-center border border-dashed border-border/70 rounded-xl text-muted-foreground text-[11px]">
                  No leave policy assigned.
                </div>
              ) : (
                (data?.leaveSummary?.balances || []).map((b: any) => (
                  <div
                    key={b.type}
                    className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/60 text-xs"
                  >
                    <span className="text-foreground font-medium capitalize text-[11px]">
                      {b.type} Leave
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground font-mono">{b.used}/{b.total}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {b.remaining} left
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Sandwich Policy Active</span>
            <span className="font-medium text-primary">Mon – Sat Working</span>
          </div>
        </div>

        {/* Card 4: Culture, Kudos & Upcoming Holidays */}
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

      {/* ── 5. Bottom Grid: Recent Payslips & Workflow Tasks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payslips */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Recent Payslips & Earnings
            </h3>
            <Link
              href="/hrms/employee/payslips"
              className="text-xs text-primary hover:underline font-semibold"
            >
              View all
            </Link>
          </div>

          {(data?.recentPayslips || []).length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border/80 rounded-xl text-muted-foreground text-xs">
              No payslips generated yet for current fiscal cycle.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(data?.recentPayslips || []).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground">
                      {p.month} {p.year}
                    </span>
                    <span className="block text-[10px] text-muted-foreground capitalize">
                      Status: {p.status}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{Number(p.netPay).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Tasks & Regularization Queue */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" /> Pending Action Items
            </h3>
            <Link
              href="/hrms/tasks"
              className="text-xs text-primary hover:underline font-semibold"
            >
              Task center
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">Assigned Tasks</span>
                  <span className="text-[10px] text-muted-foreground">Pending your action</span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono font-bold text-primary">
                {data?.actions?.pendingTasksCount || 0}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground block">Regularization Requests</span>
                  <span className="text-[10px] text-muted-foreground">Awaiting manager sign-off</span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {data?.actions?.pendingRegularizations || 0}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
