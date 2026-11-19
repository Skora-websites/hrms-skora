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

export default function HrAdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const filteredEmployees = (data?.recentEmployees || []).filter((emp: any) => {
    if (!searchEmployee) return true;
    const q = searchEmployee.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.employeeCode.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
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

      {/* ── 1. Top Operations Banner ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Strategic HR Command Center
              </h2>
              <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                Enterprise Workforce Portal
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Overseeing organization headcount, statutory payroll compliance, shift attendance, and lifecycle gates.
            </p>

            <div className="flex items-center gap-2.5 mt-3 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/50 border border-border/60 font-semibold text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" /> {headcount.totalEmployees} Total Staff
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 font-semibold text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" /> {headcount.pendingOnboardingCount} Pending Onboarding
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/20 font-semibold text-sky-600 dark:text-sky-400">
                <TrendingUp className="h-3.5 w-3.5" /> {headcount.probationCount} in Probation
              </span>
            </div>
          </div>

          {/* Rapid Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setShowAddEmployee(true)}
              className="h-8 text-xs font-semibold rounded-xl bg-primary text-white gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Employee
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowIssueLetter(true)}
              className="h-8 text-xs font-semibold rounded-xl gap-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/5 hover:border-emerald-500/40"
            >
              <Shield className="h-3.5 w-3.5" /> Issue Verified Letter
            </Button>

            <Button
              variant="ghost"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchDashboardSummary(false)}
              className="h-8 text-xs font-semibold rounded-xl text-muted-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. HR Personal Attendance Punch Card ── */}
      <div className="mb-6">
        <AttendancePunchCard />
      </div>

      {/* ── 3. Strategic 4-Pillar Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pillar 1: Statutory Payroll & Compliance Card */}
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

        {/* Pillar 2: Organization Attendance Radar */}
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

      {/* ── 4. Unified Employee Lifecycle Clearance Gate ── */}
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

      {/* ── 5. Active Employees Quick Directory ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Workforce Roster Overview
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
                  {emp.designation} • {emp.department}
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
