"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  MapPin,
} from "lucide-react";

export default function SuperAdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Platform security
  const [sessionTimeout, setSessionTimeout] = useState(480); // minutes
  const [passwordMinLength, setPasswordMinLength] = useState(8);
  const [passwordExpiryDays, setPasswordExpiryDays] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState("razorpay");

  // Work Rules
  const [officeStart, setOfficeStart] = useState(10);
  const [officeEnd, setOfficeEnd] = useState(19);
  const [lateAfter, setLateAfter] = useState(10.5);
  const [requiredHours, setRequiredHours] = useState(8.5);
  const [breakAllowance, setBreakAllowance] = useState(30);
  const [meetingCountsAsWork, setMeetingCountsAsWork] = useState(true);
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri

  // Geofencing & Location
  const [geofencingEnabled, setGeofencingEnabled] = useState(true);
  const [officeLatitude, setOfficeLatitude] = useState(28.6007974);
  const [officeLongitude, setOfficeLongitude] = useState(77.4323678);
  const [geofenceRadius, setGeofenceRadius] = useState(100); // meters
  const [allowRemotePunch, setAllowRemotePunch] = useState(true);

  const toggleWorkDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // 24h decimal hour (e.g. 10.5) → clean 12h label ("10:30 AM"). Fixes the
  // old "10.5:00 AM"-style labels produced by naive string interpolation.
  const fmtHour = (h: number) => {
    const hour24 = Math.floor(h);
    const minutes = Math.round((h - hour24) * 60);
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };
  // Decimal hour → "1h 30m"-style duration label.
  const fmtDuration = (h: number) => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
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
            if (s.officeRules.meetingCountsAsWork !== undefined) setMeetingCountsAsWork(s.officeRules.meetingCountsAsWork);
              if (s.officeRules.workDays) setWorkDays(s.officeRules.workDays);
            }
            if (s.sessionTimeout !== undefined) setSessionTimeout(s.sessionTimeout);
            if (s.passwordMinLength !== undefined) setPasswordMinLength(s.passwordMinLength);
            if (s.passwordExpiryDays !== undefined) setPasswordExpiryDays(s.passwordExpiryDays);
            if (s.geofencing) {
              if (s.geofencing.enabled !== undefined) setGeofencingEnabled(s.geofencing.enabled);
              if (s.geofencing.latitude !== undefined) setOfficeLatitude(s.geofencing.latitude);
              if (s.geofencing.longitude !== undefined) setOfficeLongitude(s.geofencing.longitude);
              if (s.geofencing.radius !== undefined) setGeofenceRadius(s.geofencing.radius);
              if (s.geofencing.allowRemote !== undefined) setAllowRemotePunch(s.geofencing.allowRemote);
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
            officeRules: { officeStart, officeEnd, lateAfter, workDays, requiredHours, breakAllowance, meetingCountsAsWork },
            sessionTimeout,
            passwordMinLength,
            passwordExpiryDays,
            geofencing: {
              enabled: geofencingEnabled,
              latitude: officeLatitude,
              longitude: officeLongitude,
              radius: geofenceRadius,
              allowRemote: allowRemotePunch,
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
              label="Password Expiry (days)"
              description="Force a password change after N days (0 = never). Exempt: CEO account."
            >
              <input
                type="number"
                min={0}
                max={365}
                value={passwordExpiryDays}
                onChange={(e) => setPasswordExpiryDays(Math.max(0, Math.min(365, Number(e.target.value))))}
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
              description="Displayed shift start. Employees can punch in ANY time before this — the punch is never blocked; only the PRESENT/LATE label is derived from these hours."
            >
              <select
                value={officeStart}
                onChange={(e) => setOfficeStart(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {Array.from({ length: 13 }, (_, i) => 6 + i * 0.5).map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
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
                {Array.from({ length: 11 }, (_, i) => 14 + i * 0.5).map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
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
                {Array.from({ length: 13 }, (_, i) => 10 + i * 0.5).map((h) => (
                  <option key={h} value={h}>{fmtHour(h)}</option>
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
                  <option key={h} value={h}>{fmtDuration(h)}</option>
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
              description="When enabled, time in Meeting AUX state counts toward effective work hours (saved with work rules)"
            >
              <Toggle checked={meetingCountsAsWork} onChange={setMeetingCountsAsWork} />
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

        {/* ═══ Office Geofencing & Location Verification ═══ */}
        <SettingsSection
          title="Office Geofencing & Location Verification"
          icon={<MapPin className="h-5 w-5 text-indigo-500" />}
          description="Configure GPS boundary coordinates, punch radius, and remote attendance verification"
        >
          <div className="space-y-4">
            <SettingsRow
              label="Enable Geofence Verification"
              description="Verify employee device GPS coordinates on every punch-in and punch-out"
            >
              <Toggle checked={geofencingEnabled} onChange={setGeofencingEnabled} />
            </SettingsRow>

            <SettingsRow
              label="Office Latitude"
              description="Center latitude coordinate of the primary office premises"
            >
              <input
                type="number"
                step="any"
                value={officeLatitude}
                onChange={(e) => setOfficeLatitude(Number(e.target.value))}
                className="w-36 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right font-mono"
              />
            </SettingsRow>

            <SettingsRow
              label="Office Longitude"
              description="Center longitude coordinate of the primary office premises"
            >
              <input
                type="number"
                step="any"
                value={officeLongitude}
                onChange={(e) => setOfficeLongitude(Number(e.target.value))}
                className="w-36 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right font-mono"
              />
            </SettingsRow>

            <SettingsRow
              label="Geofence Radius (meters)"
              description="Allowed distance radius from office coordinates to qualify as IN_OFFICE"
            >
              <select
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                className="w-32 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {[50, 100, 150, 250, 500, 1000].map((r) => (
                  <option key={r} value={r}>{r} meters</option>
                ))}
              </select>
            </SettingsRow>

            <SettingsRow
              label="Allow Remote / WFH Punch"
              description="Allow employees outside the geofence to punch in with work location flagged as REMOTE"
            >
              <Toggle checked={allowRemotePunch} onChange={setAllowRemotePunch} />
            </SettingsRow>

            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                Geofence coordinates are verified using high-precision Haversine geodesic distance against the browser navigator geolocation. Employees within {geofenceRadius}m are logged as <strong>IN_OFFICE</strong>; authorized remote workers outside are marked <strong>REMOTE</strong>.
              </p>
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
          className="bg-primary text-white font-bold px-6 py-2.5 disabled:opacity-50"
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
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 backdrop-blur-md text-slate-900 dark:text-white">
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
