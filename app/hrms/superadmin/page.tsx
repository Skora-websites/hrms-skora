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

      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Welcome back, {user?.name || "CEO"}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              Executive
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time organizational governance, statutory financial burn & live operational control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          <Link href="/hrms/superadmin/settings">
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1">
              <span>Automations &amp; Crons</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>

          <Link href="/hrms/hr-admin">
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1">
              <span>HR Admin Desk</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Strategic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Total Active Staff</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {fb.activeEmployeeCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Active organizational workforce
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>On Duty Today</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {op.punchedIn ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {op.inOffice ?? 0} In Office &bull; {op.remote ?? 0} Remote
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Projected Monthly Outflow</span>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight truncate">
            {formatCurrency(fb.totalProjectedBurn ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Wages + EPFO + ESIC + Claims
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Governance Radar</span>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground tracking-tight">
            {(gq.totalUnassigned ?? 0) + (gq.totalEscalations ?? 0)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {gq.totalUnassigned ?? 0} Unassigned &bull; {gq.totalEscalations ?? 0} 48h Escalations
          </p>
        </div>
      </div>

      {/* Strategic Pillar 1: Financial Burn & Statutory Outflows */}
      <div className="mt-6">
        <CeoFinancialBurnCard data={fb} />
      </div>

      {/* Strategic Pillar 2: Organization Live Operations & AUX Radar */}
      <div className="mt-6">
        <CeoOperationsRadar data={op} />
      </div>

      {/* Strategic Pillar 3: Governance & Escalations Console */}
      <div className="mt-6">
        <CeoGovernanceConsole
          unassigned={gq.unassignedManagers || []}
          escalations={gq.onboardingEscalations || []}
          availableManagers={gq.availableManagers || []}
          directory={directory}
          onAssignManager={handleAssignReportingManager}
          onEditUser={handleOpenEditUser}
        />
      </div>

      {/* Strategic Pillar 4: Pure MySQL System Health & Audit Logs */}
      <div className="mt-6 mb-12">
        <CeoSystemHealthCard data={sh} />
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
