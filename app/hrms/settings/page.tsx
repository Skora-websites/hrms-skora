"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Settings, Shield, Clock, Bell, User, CheckCircle2, Moon, Sun, Lock, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Office timing settings (Admin / HR)
  const [officeStartTime, setOfficeStartTime] = useState("10:00");
  const [officeEndTime, setOfficeEndTime] = useState("19:00");
  const [gracePeriodMins, setGracePeriodMins] = useState(30);

  // Personal preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [attendanceNotifs, setAttendanceNotifs] = useState(true);

  const isAdmin = user?.role === "super_admin" || user?.role === "hr_admin";

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/hrm/v2/settings?role=" + (user?.role || "employee"));
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const s = data.data;
            if (s.officeStartTime) setOfficeStartTime(s.officeStartTime);
            if (s.officeEndTime) setOfficeEndTime(s.officeEndTime);
            if (s.gracePeriodMins !== undefined) setGracePeriodMins(s.gracePeriodMins);
            if (s.emailNotifs !== undefined) setEmailNotifs(s.emailNotifs);
            if (s.attendanceNotifs !== undefined) setAttendanceNotifs(s.attendanceNotifs);
          }
        }
      } catch { /* use defaults */ }
      setLoading(false);
    };
    if (user?.role) loadSettings();
    else setLoading(false);
  }, [user?.role]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/hrm/v2/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: user?.role || "employee",
          settings: {
            officeStartTime,
            officeEndTime,
            gracePeriodMins,
            emailNotifs,
            attendanceNotifs,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setError(err.error || "Save failed - are you logged in?");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error - could not reach server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Role-Based Settings & Preferences">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings & Preferences</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configured for role: <strong className="text-primary uppercase">{user?.role || "Employee"}</strong>
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
            </div>
          ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {/* Theme & Display Configuration */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Sun className="h-5 w-5 text-primary" /> Appearance & Dual-Theme System
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between High-Contrast Professional Light Mode and Dark Mode.
            </p>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10">
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">Theme Mode</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select clean high-contrast light theme or dark theme
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Role-Specific: Office Timings & Policy (HR Admin & Superadmin ONLY) */}
          {isAdmin && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="h-5 w-5 text-primary" /> Company Office Hours & Geofence Policy
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set standard company shift hours for automated Present / Late calculation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={officeStartTime}
                    onChange={(e) => setOfficeStartTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={officeEndTime}
                    onChange={(e) => setOfficeEndTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={gracePeriodMins}
                    onChange={(e) => setGracePeriodMins(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications & Security Preferences */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Bell className="h-5 w-5 text-primary" /> Notifications & Security
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">Email Notifications</span>
                  <span className="text-slate-500 dark:text-slate-400">Receive email alerts for leave approvals and task assignments</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 cursor-pointer">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">Attendance Alerts</span>
                  <span className="text-slate-500 dark:text-slate-400">Get notified when attendance is punched or shift hours complete</span>
                </div>
                <input
                  type="checkbox"
                  checked={attendanceNotifs}
                  onChange={(e) => setAttendanceNotifs(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </label>
            </div>
          </div>

          {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <span>{error}</span>
              </div>
            )}

            <div>
              <Button type="submit" disabled={saving} className="bg-primary text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-50">
                {saving ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>) : "Save All Settings"}
              </Button>
            </div>
          </form>
          )}
      </div>
    </AppShell>
  );
}
