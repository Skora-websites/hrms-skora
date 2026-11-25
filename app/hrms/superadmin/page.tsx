"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  X,
  ExternalLink,
  Loader2,
  BarChart3,
  Radio,
  Server,
  Layers,
  Sliders,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Building2,
  Sparkles,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { CeoFinancialBurnCard } from "@/components/superadmin/ceo-financial-burn-card";
import { CeoOperationsRadar } from "@/components/superadmin/ceo-operations-radar";
import {
  CeoGovernanceConsole,
  type DirectoryUser,
} from "@/components/superadmin/ceo-governance-console";
import { CeoSystemHealthCard } from "@/components/superadmin/ceo-system-health-card";

export default function SuperadminOverviewPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "radar" | "governance" | "system" | "all">("overview");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [syncRelativeTime, setSyncRelativeTime] = useState<string>("Synced just now");

  const VALID_TABS = ["overview", "finance", "radar", "governance", "system", "all"] as const;

  // URL deep-linking synchronization
  useEffect(() => {
    const urlTab = new URLSearchParams(window.location.search).get("tab");
    if (urlTab && (VALID_TABS as readonly string[]).includes(urlTab)) {
      setActiveTab(urlTab as any);
    }
    const onPopState = () => {
      const popTab = new URLSearchParams(window.location.search).get("tab");
      if (popTab && (VALID_TABS as readonly string[]).includes(popTab)) {
        setActiveTab(popTab as any);
      } else {
        setActiveTab("overview");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const switchTab = (tab: "overview" | "finance" | "radar" | "governance" | "system" | "all") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const qs = params.toString() ? `?${params.toString()}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  };

  // Live freshness relative time counter
  useEffect(() => {
    const updateRelative = () => {
      const diffSec = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
      if (diffSec < 45) {
        setSyncRelativeTime("Synced just now");
      } else if (diffSec < 3600) {
        setSyncRelativeTime(`Synced ${Math.floor(diffSec / 60)}m ago`);
      } else {
        setSyncRelativeTime(`Synced ${Math.floor(diffSec / 3600)}h ago`);
      }
    };
    updateRelative();
    const interval = setInterval(updateRelative, 10000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  // Edit / Delete User Modal
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editReportingManager, setEditReportingManager] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DirectoryUser | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/hrm/v2/superadmin/dashboard-summary");
      if (!res.ok) {
        throw new Error(`Failed to load summary: ${res.statusText}`);
      }
      const json = await res.json();
      if (json?.data) {
        setData(json.data);
        setError(null);
        setLastSyncedAt(new Date());
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load executive summary");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 60-second soft background refresh (replaces 10-second spam polling)
    const interval = setInterval(() => {
      loadData(true);
    }, 60000);

    const handlePunchUpdate = () => {
      loadData(true);
    };
    window.addEventListener("attendance-updated", handlePunchUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handlePunchUpdate);
    };
  }, [loadData]);

  // CEO 1-Click Reporting Manager Assignment
  const handleAssignReportingManager = async (employeeId: string, managerName: string) => {
    try {
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: employeeId,
          action: "profile",
          reportingManager: managerName,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to assign reporting manager");
      }

      showToast(`Reporting manager assigned to ${managerName}`);
      loadData(true);
    } catch (err: any) {
      showToast(err?.message || "Assignment failed", "error");
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: DirectoryUser) => {
    setEditingUser(u);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditReportingManager(u.role === "manager" ? "" : u.reportingManager || "");
  };

  // Save Edit User Changes
  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      // 1. Role change first if modified
      if (editRole && editRole !== editingUser.role) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            action: "role",
            role: editRole,
          }),
        });
      }

      // 2. Reporting manager if modified and user is not a manager
      if (editRole !== "manager" && editReportingManager !== (editingUser.reportingManager || "")) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            action: "profile",
            reportingManager: editReportingManager,
          }),
        });
      }

      // 3. Status if modified
      if (editStatus && editStatus !== editingUser.status) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            action: "status",
            status: editStatus,
          }),
        });
      }

      showToast("User access and structure updated successfully");
      setEditingUser(null);
      loadData(true);
    } catch (err: any) {
      showToast(err?.message || "Failed to update user", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hrm/v2/users?userId=${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      showToast("User account terminated successfully");
      setConfirmDelete(null);
      setEditingUser(null);
      loadData(true);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete user", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <AppShell title="CEO Command Center">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">
            Loading executive command center...
          </p>
        </div>
      </AppShell>
    );
  }

  const fb = data?.financialBurn || {};
  const op = data?.operationsRadar || {};
  const gq = data?.governanceQueue || {};
  const sh = data?.systemHealth || {};
  const directory = data?.directory || [];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <AppShell title="CEO Command Center">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
            toastMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toastMsg.text}
        </div>
      )}

      {/* ═══ EXECUTIVE HEADER (Mobile Application Style) ═══ */}
      <div className="pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm shrink-0">
              {(user?.name || "CEO").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-2xl font-black text-foreground tracking-tight truncate">
                  Welcome back, {user?.name?.split(" ")[0] || "Executive"}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                  CEO
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
                Executive Command Center &bull; Real-time Org Pulse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-[10px] sm:text-[11px] font-semibold text-muted-foreground shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden xs:inline sm:inline">{syncRelativeTime}</span>
              <span className="xs:hidden sm:hidden">Live</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="h-8 px-2.5 sm:px-3 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions Scroll Bar (Native App Style) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 mt-3">
          <Link href="/hrms/superadmin/settings" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Automations &amp; Crons</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/hrms/hr-admin" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>HR Admin Desk</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>

          <Link href="/hrms/superadmin/audit-logs" className="shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-foreground transition-colors shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Audit Logs</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
          </Link>
        </div>
      </div>

      {/* ═══ STICKY SEGMENTED CONTROL (Mobile App Navigation) ═══ */}
      <div className="sticky top-0 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-2.5 bg-background/90 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-2xl border border-border/60 overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => switchTab("overview")}
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
            onClick={() => switchTab("finance")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "finance"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            <span>Finance</span>
          </button>

          <button
            onClick={() => switchTab("radar")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "radar"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Live Ops</span>
            {(op.punchedIn ?? 0) > 0 && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => switchTab("governance")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "governance"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Governance</span>
            {((gq.totalUnassigned ?? 0) + (gq.totalEscalations ?? 0)) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white">
                {(gq.totalUnassigned ?? 0) + (gq.totalEscalations ?? 0)}
              </span>
            )}
          </button>

          <button
            onClick={() => switchTab("system")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
              activeTab === "system"
                ? "bg-background text-foreground shadow-xs border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Server className="h-3.5 w-3.5 text-teal-500" />
            <span>System</span>
          </button>

          <button
            onClick={() => switchTab("all")}
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

      {/* ═══ TACTILE STRATEGIC KPI WIDGETS (Interactive Mobile App Cards) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        {/* Widget 1: Total Staff */}
        <div
          onClick={() => switchTab("radar")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Active Staff</span>
            <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{fb.activeEmployeeCount ?? 0}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            Active workforce
          </p>
        </div>

        {/* Widget 2: On Duty Today */}
        <div
          onClick={() => switchTab("radar")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">On Duty Today</span>
            <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center justify-between">
            <span>{op.punchedIn ?? 0}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {op.inOffice ?? 0} Office &bull; {op.remote ?? 0} Remote
          </p>
        </div>

        {/* Widget 3: Projected Monthly Outflow */}
        <div
          onClick={() => switchTab("finance")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-blue-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Monthly Outflow</span>
            <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-foreground tracking-tight truncate flex items-center justify-between">
            <span className="truncate">{formatCurrency(fb.totalProjectedBurn ?? 0)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            Wages + Statutory
          </p>
        </div>

        {/* Widget 4: Governance Radar */}
        <div
          onClick={() => switchTab("governance")}
          className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span className="font-semibold text-[11px] sm:text-xs">Governance</span>
            <div className="h-7 w-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center justify-between">
            <span>{(gq.totalUnassigned ?? 0) + (gq.totalEscalations ?? 0)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
            {gq.totalUnassigned ?? 0} Unassigned &bull; {gq.totalEscalations ?? 0} Escalations
          </p>
        </div>
      </div>

      {/* ═══ VIEW MODE CONTENT ═══ */}
      <div key={activeTab} className="mt-5 space-y-5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200 ease-out">
        {/* ─── TAB 1: OVERVIEW (Mobile Native Executive Summary) ─── */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Snapshot 1: Fiscal Runway Pulse */}
            <div className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Monthly Fiscal Burn</h3>
                    <p className="text-[11px] text-muted-foreground">Statutory commitments &amp; gross base wages</p>
                  </div>
                </div>
                <button
                  onClick={() => switchTab("finance")}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0"
                >
                  <span>Deep Dive</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 mb-3">
                <div className="text-xs text-muted-foreground font-semibold">Total Projected Outflow</div>
                <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight my-0.5">
                  {formatCurrency(fb.totalProjectedBurn ?? 0)}
                </div>
                {/* Visual Ratio Bar */}
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden mt-2.5 flex">
                  <div
                    className="bg-primary h-full rounded-l-full"
                    style={{
                      width: `${
                        (fb.totalProjectedBurn || 0) > 0
                          ? Math.min(100, Math.round(((fb.totalMonthlyGrossCommitment || 0) / (fb.totalProjectedBurn || 1)) * 100))
                          : 100
                      }%`,
                    }}
                    title="Base Wages"
                  />
                  <div
                    className="bg-emerald-500 h-full rounded-r-full"
                    style={{
                      width: `${
                        (fb.totalProjectedBurn || 0) > 0
                          ? Math.min(100, Math.round((((fb.employerEpfo || 0) + (fb.employerEsic || 0)) / (fb.totalProjectedBurn || 1)) * 100))
                          : 0
                      }%`,
                    }}
                    title="Statutory Liabilities"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-medium">
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Base Wages: {formatCurrency(fb.totalMonthlyGrossCommitment ?? 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Statutory: {formatCurrency((fb.employerEpfo || 0) + (fb.employerEsic || 0))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Avg / Staff</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    {formatCurrency(
                      fb.activeEmployeeCount > 0
                        ? Math.round((fb.totalProjectedBurn || 0) / fb.activeEmployeeCount)
                        : 0
                    )}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Statutory Match</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {fb.totalMonthlyGrossCommitment > 0
                      ? `${((((fb.employerEpfo || 0) + (fb.employerEsic || 0)) / fb.totalMonthlyGrossCommitment) * 100).toFixed(1)}%`
                      : "0%"} of Gross
                  </div>
                </div>
              </div>
            </div>

            {/* Snapshot 2: Operations Live Pulse */}
            <div className="p-4 sm:p-6 rounded-2xl border border-border/80 bg-card shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Radio className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Live Operations Pulse</h3>
                    <p className="text-[11px] text-muted-foreground">Workforce presence &amp; real-time statuses</p>
                  </div>
                </div>
                <button
                  onClick={() => switchTab("radar")}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                >
                  <span>Open Radar</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              {/* Status Chips Row */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {op.punchedIn ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">On Duty</div>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {op.activeAux ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Active AUX</div>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <div className="text-sm sm:text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {op.onBreak ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">On Break</div>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <div className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400">
                    {op.absent ?? 0}
                  </div>
                  <div className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">Absent</div>
                </div>
              </div>

              {/* Preview of Live Staff */}
              <div className="space-y-1.5">
                {(op.liveEmployees || []).slice(0, 3).map((emp: any) => (
                  <div
                    key={emp.userId}
                    className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-muted/20 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="font-semibold text-foreground truncate block">{emp.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {emp.designation}
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

            {/* Snapshot 3: Governance & System Quick Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Governance Micro Card */}
              <div
                onClick={() => switchTab("governance")}
                className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-xs text-foreground">CEO Governance</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-amber-500 transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Missing Managers:</span>
                    <span className="font-bold text-foreground">
                      {gq.totalUnassigned === 0 ? "0 (Intact)" : `${gq.totalUnassigned} Needed`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>48h Escalations:</span>
                    <span className="font-bold text-foreground">{gq.totalEscalations ?? 0} Overdue</span>
                  </div>
                </div>
              </div>

              {/* System Engine Micro Card */}
              <div
                onClick={() => switchTab("system")}
                className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-teal-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-teal-500" />
                    <span className="font-bold text-xs text-foreground">System Engine</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-teal-500 transition-colors" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Database:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      MySQL 8.0 &bull; {sh.pingLatencyMs || 51}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Sessions:</span>
                    <span className="font-bold text-foreground">{sh.activeSessions ?? 2} Web Sessions</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: FINANCIAL PILLAR DEEP DIVE ─── */}
        {(activeTab === "finance" || activeTab === "all") && (
          <div>
            <CeoFinancialBurnCard data={fb} />
          </div>
        )}

        {/* ─── TAB 3: LIVE OPERATIONS RADAR ─── */}
        {(activeTab === "radar" || activeTab === "all") && (
          <div>
            <CeoOperationsRadar data={op} />
          </div>
        )}

        {/* ─── TAB 4: CEO GOVERNANCE & ESCALATION CONSOLE ─── */}
        {(activeTab === "governance" || activeTab === "all") && (
          <div>
            <CeoGovernanceConsole
              unassigned={gq.unassignedManagers || []}
              escalations={gq.onboardingEscalations || []}
              availableManagers={gq.availableManagers || []}
              directory={directory}
              onAssignManager={handleAssignReportingManager}
              onEditUser={handleOpenEditUser}
            />
          </div>
        )}

        {/* ─── TAB 5: SYSTEM HEALTH & SECURITY AUDIT STREAM ─── */}
        {(activeTab === "system" || activeTab === "all") && (
          <div className="mb-12">
            <CeoSystemHealthCard data={sh} />
          </div>
        )}
      </div>

      {/* ═══ CEO USER EDIT MODAL ═══ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Manage Access: {editingUser.displayName || editingUser.email}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  User Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="super_admin">Super Admin (CEO)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Promoting to manager automatically clears any reporting manager hierarchy.
                </p>
              </div>

              {editRole !== "manager" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Reporting Manager (CEO Controlled)
                  </label>
                  <select
                    value={editReportingManager}
                    onChange={(e) => setEditReportingManager(e.target.value)}
                    className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {(gq.availableManagers || []).map((m: any) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Account Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 text-xs rounded-lg border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="disabled">Disabled / Locked</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(editingUser)}
                className="text-xs flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEditUser}
                  disabled={saving}
                  className="text-xs"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-destructive/30 bg-card p-6 shadow-xl text-card-foreground">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-5 w-5" />
              <h4 className="text-sm font-bold">Terminate User Account</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">
                {confirmDelete.displayName || confirmDelete.email}
              </strong>
              ? This action is irrevocable and logged in the system audit stream.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteUser}
                disabled={saving}
                className="text-xs"
              >
                {saving ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
