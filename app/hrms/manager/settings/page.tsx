"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Layout,
  RefreshCw,
  CheckCircle2,
  ClipboardList,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function ManagerSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Notification preferences
  const [notifyOvertime, setNotifyOvertime] = useState(true);
  const [notifyLeaveRequests, setNotifyLeaveRequests] = useState(true);
  const [notifyRegularization, setNotifyRegularization] = useState(true);
  const [notifyTaskAssigned, setNotifyTaskAssigned] = useState(true);

  // Auto-assignment rules
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [autoAssignStrategy, setAutoAssignStrategy] = useState("round_robin");

  // Dashboard layout
  const [compactMode, setCompactMode] = useState(false);
  const [showRosterOnTop, setShowRosterOnTop] = useState(true);
  const [defaultView, setDefaultView] = useState("overview");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/hrm/v2/settings?role=manager");
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const s = data.data;
            if (s.notifications) {
              if (s.notifications.overtime !== undefined) setNotifyOvertime(s.notifications.overtime);
              if (s.notifications.leaveRequests !== undefined) setNotifyLeaveRequests(s.notifications.leaveRequests);
              if (s.notifications.regularization !== undefined) setNotifyRegularization(s.notifications.regularization);
              if (s.notifications.taskAssigned !== undefined) setNotifyTaskAssigned(s.notifications.taskAssigned);
            }
            if (s.autoAssignment) {
              if (s.autoAssignment.enabled !== undefined) setAutoAssignEnabled(s.autoAssignment.enabled);
              if (s.autoAssignment.strategy) setAutoAssignStrategy(s.autoAssignment.strategy);
            }
            if (s.dashboard) {
              if (s.dashboard.compactMode !== undefined) setCompactMode(s.dashboard.compactMode);
              if (s.dashboard.showRosterOnTop !== undefined) setShowRosterOnTop(s.dashboard.showRosterOnTop);
              if (s.dashboard.defaultView) setDefaultView(s.dashboard.defaultView);
            }
          }
        }
      } catch { /* use defaults */ }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const apiRes = await fetch("/api/hrm/v2/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "manager",
          settings: {
            notifications: { overtime: notifyOvertime, leaveRequests: notifyLeaveRequests, regularization: notifyRegularization, taskAssigned: notifyTaskAssigned },
            autoAssignment: { enabled: autoAssignEnabled, strategy: autoAssignStrategy },
            dashboard: { compactMode, showRosterOnTop, defaultView },
          },
        }),
      });
      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({ error: "Save failed" }));
        setError(err.error || "Save failed - are you logged in?");
        return;
      }
        } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppShell title="Manager Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manager Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Notification preferences, auto-assignment rules &amp; dashboard layout
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Settings saved successfully!
          </div>
        )}

        {/* Notification Preferences */}
        <SettingsSection
          title="Notification Preferences"
          icon={<Bell className="h-5 w-5 text-primary" />}
          description="Control which notifications you receive for team requests"
        >
          <div className="space-y-3">
            <ToggleRow label="Overtime Requests" description="Notify when team members submit overtime" checked={notifyOvertime} onChange={setNotifyOvertime} />
            <ToggleRow label="Leave Requests" description="Notify when team members request leave" checked={notifyLeaveRequests} onChange={setNotifyLeaveRequests} />
            <ToggleRow label="Regularization Requests" description="Notify when team members request regularization" checked={notifyRegularization} onChange={setNotifyRegularization} />
            <ToggleRow label="Task Assigned" description="Notify when tasks are assigned to your team" checked={notifyTaskAssigned} onChange={setNotifyTaskAssigned} />
          </div>
        </SettingsSection>

        {/* Auto-Assignment Rules */}
        <SettingsSection
          title="Auto-Assignment Rules"
          icon={<ClipboardList className="h-5 w-5 text-yellow-500" />}
          description="Automatically assign recurring tasks to team members"
        >
          <div className="space-y-3">
            <ToggleRow label="Enable Auto-Assignment" description="Automatically distribute new recurring tasks" checked={autoAssignEnabled} onChange={setAutoAssignEnabled} />
            {autoAssignEnabled && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Strategy</label>
                <select
                  value={autoAssignStrategy}
                  onChange={(e) => setAutoAssignStrategy(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="round_robin">Round Robin (Cyclic)</option>
                  <option value="least_loaded">Least Loaded</option>
                  <option value="random">Random</option>
                </select>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Dashboard Layout */}
        <SettingsSection
          title="Dashboard Metric Layout"
          icon={<Layout className="h-5 w-5 text-blue-500" />}
          description="Customize your dashboard view and metric display"
        >
          <div className="space-y-3">
            <ToggleRow label="Compact Mode" description="Show more data in less space" checked={compactMode} onChange={setCompactMode} />
            <ToggleRow label="Team Roster on Top" description="Show daily roster at the top of the dashboard" checked={showRosterOnTop} onChange={setShowRosterOnTop} />
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Default View</label>
              <select
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="overview">Overview</option>
                <option value="approvals">Approvals</option>
                <option value="projects">Projects</option>
                <option value="analytics">Analytics</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={saving} className="bg-primary text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </AppShell>
  );
}

function SettingsSection({ title, icon, description, children }: { title: string; icon: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <h3 className="font-bold text-base flex items-center gap-2 mb-1">{icon} {title}</h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">{description}</p>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
      <div>
        <span className="text-xs font-semibold text-slate-900 dark:text-white block">{label}</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{description}</span>
      </div>
      <button type="button" onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
