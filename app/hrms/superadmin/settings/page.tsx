"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Key,
  RefreshCw,
  CheckCircle2,
  Lock,
  Globe,
  Database,
  Clock,
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Platform security
  const [sessionTimeout, setSessionTimeout] = useState(480); // minutes
  const [enforce2FA, setEnforce2FA] = useState(false);
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(90);

  // API keys
  const [geolocationKey, setGeolocationKey] = useState("");
  const [paymentGatewayKey, setPaymentGatewayKey] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("razorpay");

  // Firebase Auth sync
  const [autoSync, setAutoSync] = useState(true);
  const [lastSync, setLastSync] = useState("2026-08-20 10:30 AM");
  const [syncing, setSyncing] = useState(false);

  // Work Rules
  const [officeStart, setOfficeStart] = useState(10);
  const [officeEnd, setOfficeEnd] = useState(19);
  const [lateAfter, setLateAfter] = useState(10.5);
  const [requiredHours, setRequiredHours] = useState(8.5);
  const [breakAllowance, setBreakAllowance] = useState(30);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [officeLat, setOfficeLat] = useState("");
  const [officeLng, setOfficeLng] = useState(""); // Mon-Fri

  const toggleWorkDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/hrm/v2/settings?role=super_admin");
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const s = data.data;
            if (s.officeRules) {
              if (s.officeRules.officeStart !== undefined) setOfficeStart(s.officeRules.officeStart);
              if (s.officeRules.officeEnd !== undefined) setOfficeEnd(s.officeRules.officeEnd);
              if (s.officeRules.lateAfter !== undefined) setLateAfter(s.officeRules.lateAfter);
              if (s.officeRules.requiredHours !== undefined) setRequiredHours(s.officeRules.requiredHours);
              if (s.officeRules.breakAllowance !== undefined) setBreakAllowance(s.officeRules.breakAllowance);
              if (s.officeRules.workDays) setWorkDays(s.officeRules.workDays);
            }
            if (s.sessionTimeout !== undefined) setSessionTimeout(s.sessionTimeout);
            if (s.enforce2FA !== undefined) setEnforce2FA(s.enforce2FA);
            if (s.passwordMinLength !== undefined) setPasswordMinLength(s.passwordMinLength);
            if (s.passwordExpiryDays !== undefined) setPasswordExpiryDays(s.passwordExpiryDays);
            if (s.apiKeys) {
              if (s.apiKeys.geolocation !== undefined) setGeolocationKey(s.apiKeys.geolocation);
              if (s.apiKeys.paymentGateway !== undefined) setPaymentGatewayKey(s.apiKeys.paymentGateway);
              if (s.apiKeys.paymentProvider !== undefined) setPaymentProvider(s.apiKeys.paymentProvider);
            }
            if (s.syncSettings) {
              if (s.syncSettings.autoSync !== undefined) setAutoSync(s.syncSettings.autoSync);
              if (s.syncSettings.lastSync !== undefined) setLastSync(s.syncSettings.lastSync);
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
          role: "super_admin",
          userId: "system",
          settings: {
            officeRules: { officeStart, officeEnd, lateAfter, workDays, requiredHours, breakAllowance, meetingCountsAsWork: true },
            geofence: { latitude: officeLat, longitude: officeLng },
            sessionTimeout,
            enforce2FA,
            passwordMinLength,
            passwordExpiryDays,
            apiKeys: {
              geolocation: geolocationKey,
              paymentGateway: paymentGatewayKey,
              paymentProvider,
            },
            syncSettings: {
              autoSync,
              lastSync,
            },
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

  const handleSyncNow = async () => {
    setSyncing(true);
    // Simulate sync
    await new Promise((r) => setTimeout(r, 2000));
    setLastSync(new Date().toLocaleString());
    setSyncing(false);
  };

  return (
    <AppShell title="Super Admin Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Platform Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Global platform security, API key management &amp; Firebase Auth sync
          controls
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved successfully!
          </div>
        )}

        {/* ═══ Global Platform Security ═══ */}
        <SettingsSection
          title="Global Platform Security"
          icon={<Shield className="h-5 w-5 text-primary" />}
          description="Session management, 2FA enforcement, and password policies"
        >
          <div className="space-y-4">
            <SettingsRow
              label="Session Timeout"
              description="Auto-logout after inactivity (minutes)"
            >
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-24 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right"
              />
            </SettingsRow>

            <SettingsRow
              label="Enforce 2FA"
              description="Require two-factor authentication for all users"
            >
              <Toggle
                checked={enforce2FA}
                onChange={setEnforce2FA}
              />
            </SettingsRow>

            <SettingsRow
              label="Minimum Password Length"
              description="Minimum characters required for new passwords"
            >
              <input
                type="number"
                value={passwordMinLength}
                onChange={(e) => setPasswordMinLength(Number(e.target.value))}
                className="w-24 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right"
              />
            </SettingsRow>

            <SettingsRow
              label="Password Expiry"
              description="Force password reset after N days (0 = never)"
            >
              <input
                type="number"
                value={passwordExpiryDays}
                onChange={(e) => setPasswordExpiryDays(Number(e.target.value))}
                className="w-24 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right"
              />
            </SettingsRow>
          </div>
        </SettingsSection>

        {/* ═══ Work Rules & Office Hours ═══ */}
        <SettingsSection
          title="Work Rules & Office Hours"
          icon={<Clock className="h-5 w-5 text-emerald-500" />}
          description="Configure office hours, work days, late policy, and punch-in/out rules for all employees"
        >
          <div className="space-y-4">
            <SettingsRow
              label="Office Start Time"
              description="Employees can punch in after this time"
            >
              <select
                value={officeStart}
                onChange={(e) => setOfficeStart(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 12 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? "PM" : "AM"}</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Office End Time"
              description="Shift ends at this time. Punch-out after this = overtime"
            >
              <select
                value={officeEnd}
                onChange={(e) => setOfficeEnd(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 8 }, (_, i) => i + 14).map((h) => (
                  <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? "PM" : "AM"}</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Late After"
              description="Punch-in after this time is marked as LATE"
            >
              <select
                value={lateAfter}
                onChange={(e) => setLateAfter(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 8 }, (_, i) => 10 + i * 0.5).map((h) => (
                  <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? "PM" : "AM"}</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Required Login Hours"
              description="Minimum effective work hours required per day (Active + Meeting time)"
            >
              <select
                value={requiredHours}
                onChange={(e) => setRequiredHours(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {[7, 7.5, 8, 8.5, 9].map((h) => (
                  <option key={h} value={h}>{h}h {h % 1 === 0.5 ? "30m" : "00m"}</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Break Allowance (minutes)"
              description="Total break time allowed per day. Excess break deducts from login hours."
            >
              <select
                value={breakAllowance}
                onChange={(e) => setBreakAllowance(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {[0, 15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Meeting Counts as Work"
              description="When enabled, time in Meeting AUX state counts toward required login hours"
            >
              <Toggle checked={true} onChange={() => {}} />
            </SettingsRow>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                AUX States: Employees can toggle between <strong>Active</strong> (work counts), <strong>On-Break</strong> (does not count), and <strong>Meeting</strong> (counts as work) at any time during office hours.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Work Days (Click to toggle)
              </label>
              <div className="flex gap-2 flex-wrap">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      workDays.includes(idx)
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-white dark:bg-black/40 text-slate-400 border-gray-200 dark:border-white/10"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Non-work days are marked as WEEK_OFF. Employees cannot punch in on off days.
              </p>
            </div>
          </div>
        </SettingsSection>

        
        {/* ═══ Office Geofence Coordinates ═══ */}
        <SettingsSection
          title="Office Geofence Coordinates"
          icon={<Globe className="h-5 w-5 text-red-500" />}
          description="Set office location for 100-meter geofenced punch validation"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
              <input type="text" value={officeLat} onChange={(e) => setOfficeLat(e.target.value)} placeholder="28.6007594" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
              <input type="text" value={officeLng} onChange={(e) => setOfficeLng(e.target.value)} placeholder="77.4319307" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
        </SettingsSection>

        {/* ═══ API Key Management ═══ */}
        <SettingsSection
          title="API Key Management"
          icon={<Key className="h-5 w-5 text-yellow-500" />}
          description="Geolocation, Payment Gateway and other external API keys"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Globe className="h-3.5 w-3.5 inline mr-1" />
                Geolocation API Key (for Haversine geofencing)
              </label>
              <input
                type="password"
                value={geolocationKey}
                onChange={(e) => setGeolocationKey(e.target.value)}
                placeholder="Enter geolocation service API key"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Key className="h-3.5 w-3.5 inline mr-1" />
                Payment Gateway Key
              </label>
              <div className="flex gap-2">
                <select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="w-36 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                </select>
                <input
                  type="password"
                  value={paymentGatewayKey}
                  onChange={(e) => setPaymentGatewayKey(e.target.value)}
                  placeholder="Enter payment gateway secret key"
                  className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ═══ MongoDB Database & Directory Sync ═══ */}
        <SettingsSection
          title="MongoDB Database & Directory Sync"
          icon={<Database className="h-5 w-5 text-emerald-500" />}
          description="Manage active session cleanup and synchronization across MongoDB collections"
        >
          <div className="space-y-4">
            <SettingsRow
              label="Auto-Sync"
              description="Automatically sync MongoDB user sessions and directory permissions on login"
            >
              <Toggle checked={autoSync} onChange={setAutoSync} />
            </SettingsRow>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                  Last Sync
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lastSync}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncing}
                className="gap-2 text-xs font-bold border-gray-200 dark:border-white/10"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-primary" : ""}`}
                />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            </div>
          </div>
        </SettingsSection>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <span>{error}</span>
          </div>
        )}
        <Button
          type="submit"
          disabled={saving}
          className="bg-primary text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </form>
    </AppShell>
  );
}

// ── Helpers ─────────────────────────────────────────────

function SettingsSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <h3 className="font-bold text-base flex items-center gap-2 mb-1">
        {icon} {title}
      </h3>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
        {description}
      </p>
      {children}
    </div>
  );
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
      <div>
        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
          {label}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
