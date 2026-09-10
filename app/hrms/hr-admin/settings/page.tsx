"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  DollarSign,
  Percent,
  CheckCircle2,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";

export default function HrAdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  // Holiday calendar
  const [holidays, setHolidays] = useState([
    { id: "1", name: "Independence Day", date: "2026-08-15", type: "national" },
    { id: "2", name: "Gandhi Jayanti", date: "2026-10-02", type: "national" },
    { id: "3", name: "Diwali", date: "2026-10-20", type: "festival" },
  ]);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", type: "optional" });

  // Leave accrual
  const [clAccrual, setClAccrual] = useState(1.5); // per month
  const [slAccrual, setSlAccrual] = useState(1.0);
  const [alAccrual, setAlAccrual] = useState(2.0);
  const [carryForward, setCarryForward] = useState(false);
  const [carryForwardLimit, setCarryForwardLimit] = useState(5);

  // Payroll deductions
  const [pfPercent, setPfPercent] = useState(12);
  const [esiPercent, setEsiPercent] = useState(0.75);
  const [professionalTax, setProfessionalTax] = useState(200);
  const [tdsEnabled, setTdsEnabled] = useState(true);

  // Geofence
  const [officeLat, setOfficeLat] = useState("");
  const [officeLng, setOfficeLng] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/hrm/v2/settings?role=hr_admin");
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const s = data.data;
            if (s.holidays) setHolidays(s.holidays);
            if (s.leaveAccrual) {
              if (s.leaveAccrual.cl !== undefined) setClAccrual(s.leaveAccrual.cl);
              if (s.leaveAccrual.sl !== undefined) setSlAccrual(s.leaveAccrual.sl);
              if (s.leaveAccrual.al !== undefined) setAlAccrual(s.leaveAccrual.al);
              if (s.leaveAccrual.carryForward !== undefined) setCarryForward(s.leaveAccrual.carryForward);
              if (s.leaveAccrual.carryForwardLimit !== undefined) setCarryForwardLimit(s.leaveAccrual.carryForwardLimit);
            }
            if (s.payrollDeductions) {
              if (s.payrollDeductions.pfPercent !== undefined) setPfPercent(s.payrollDeductions.pfPercent);
              if (s.payrollDeductions.esiPercent !== undefined) setEsiPercent(s.payrollDeductions.esiPercent);
              if (s.payrollDeductions.professionalTax !== undefined) setProfessionalTax(s.payrollDeductions.professionalTax);
              if (s.payrollDeductions.tdsEnabled !== undefined) setTdsEnabled(s.payrollDeductions.tdsEnabled);
            }
            if (s.geofence) {
              if (s.geofence.latitude !== undefined) setOfficeLat(s.geofence.latitude);
              if (s.geofence.longitude !== undefined) setOfficeLng(s.geofence.longitude);
            }
          }
        }
      } catch { /* use defaults */ }
      setLoading(false);
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
          role: "hr_admin",
          settings: {
            holidays,
            leaveAccrual: { cl: clAccrual, sl: slAccrual, al: alAccrual, carryForward, carryForwardLimit },
            payrollDeductions: { pfPercent, esiPercent, professionalTax, tdsEnabled },
            geofence: { latitude: officeLat, longitude: officeLng },
          },
        }),
      });
      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({ error: "Save failed" }));
        setError(err.error || "Save failed - are you logged in?");
        return;
      }
    } catch {
      setError("Network error - could not reach server");
    } finally {
      setSaving(false);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      setHolidays((prev) => [...prev, { ...newHoliday, id: Date.now().toString() }]);
      setNewHoliday({ name: "", date: "", type: "optional" });
    }
  };

  const removeHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <AppShell title="HR Admin Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">HR Settings & Policies</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Company-wide holiday calendars, leave accrual rules &amp; payroll deduction brackets
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Settings saved successfully!
          </div>
        )}

        {/* ═══ Holiday Calendar ═══ */}
        <SettingsSection title="Company-Wide Holiday Calendar" icon={<CalendarDays className="h-5 w-5 text-primary" />}>
          <div className="space-y-3">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{h.name}</span>
                  <span className="block text-[10px] text-slate-500">{h.date} · {h.type}</span>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeHoliday(h.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <input type="text" placeholder="Holiday name" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs focus:outline-none focus:border-primary" />
              <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs focus:outline-none focus:border-primary" />
              <Button type="button" size="sm" onClick={addHoliday} className="bg-primary text-white font-bold text-xs">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SettingsSection>

        {/* ═══ Leave Accrual Rules ═══ */}
        <SettingsSection title="Sick / Casual Leave Accrual Rules" icon={<CalendarDays className="h-5 w-5 text-emerald-500" />}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <AccrualInput label="Casual Leave (CL)" value={clAccrual} onChange={setClAccrual} />
              <AccrualInput label="Sick Leave (SL)" value={slAccrual} onChange={setSlAccrual} />
              <AccrualInput label="Annual Leave (AL)" value={alAccrual} onChange={setAlAccrual} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Carry Forward</span>
                <span className="text-[11px] text-slate-500">Allow unused leaves to carry to next year</span>
              </div>
              <Toggle checked={carryForward} onChange={setCarryForward} />
            </div>
            {carryForward && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Max carry-forward days:</span>
                <input type="number" value={carryForwardLimit} onChange={(e) => setCarryForwardLimit(Number(e.target.value))} className="w-20 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
              </div>
            )}
          </div>
        </SettingsSection>

        {/* ═══ Payroll Deduction Brackets ═══ */}
        <SettingsSection title="Standard Payroll Deduction Brackets" icon={<DollarSign className="h-5 w-5 text-yellow-500" />}>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PF Contribution (%)</label>
                <input type="number" step="0.01" value={pfPercent} onChange={(e) => setPfPercent(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">ESI Contribution (%)</label>
                <input type="number" step="0.01" value={esiPercent} onChange={(e) => setEsiPercent(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Professional Tax (₹/month)</label>
              <input type="number" value={professionalTax} onChange={(e) => setProfessionalTax(Number(e.target.value))} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">TDS Deduction</span>
                <span className="text-[11px] text-slate-500">Apply Tax Deducted at Source for eligible employees</span>
              </div>
              <Toggle checked={tdsEnabled} onChange={setTdsEnabled} />
            </div>
          </div>
        </SettingsSection>

        {/* ═══ Geofence Office Coordinates ═══ */}
        <SettingsSection title="Office Geofence Coordinates" icon={<MapPin className="h-5 w-5 text-red-500" />}>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Set the office Latitude &amp; Longitude for 100-meter geofenced punch validation.
          </p>
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

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <span>{error}</span>
          </div>
        )}
        <Button type="submit" disabled={saving} className="bg-primary text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-50">
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </form>
    </AppShell>
  );
}

// ── Helpers ─────────────────────────────────────────────

function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <h3 className="font-bold text-base flex items-center gap-2 mb-4">{icon} {title}</h3>
      {children}
    </div>
  );
}

function AccrualInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" step="0.5" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-16 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
        <span className="text-[10px] text-slate-500">/ month</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
