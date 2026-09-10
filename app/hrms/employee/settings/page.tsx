"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Palette,
  CheckCircle2,
  Shield,
  Mail,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function EmployeeSettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Profile
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [alternateEmail, setAlternateEmail] = useState("");

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  // Theme
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/hrm/v2/settings?role=employee&userId=" + (user?.id || ""));
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            const s = data.data;
            if (s.name) setName(s.name);
            if (s.phone) setPhone(s.phone);
            if (s.alternateEmail) setAlternateEmail(s.alternateEmail);
            if (s.emergencyName) setEmergencyName(s.emergencyName);
            if (s.emergencyPhone) setEmergencyPhone(s.emergencyPhone);
            if (s.emergencyRelation) setEmergencyRelation(s.emergencyRelation);
            if (s.theme) setTheme(s.theme);
            if (s.compactMode !== undefined) setCompactMode(s.compactMode);
          }
        }
      } catch { /* use defaults */ }
      setLoading(false);
    };
    loadSettings();
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const apiRes = await fetch("/api/hrm/v2/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "employee",
          userId: user?.id || null,
          settings: {
            name,
            phone,
            alternateEmail,
            emergencyName,
            emergencyPhone,
            emergencyRelation,
            theme,
            compactMode,
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
    <AppShell title="Employee Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Personal profile, emergency contacts &amp; UI preferences
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          Loading settings...
        </div>
      ) : (
      <form onSubmit={handleSave} className="max-w-3xl space-y-6">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Settings saved successfully!
          </div>
        )}

        {/* Personal Profile */}
        <SettingsSection title="Personal Profile" icon={<User className="h-5 w-5 text-primary" />} description="Update your basic profile information">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Mail className="h-3.5 w-3.5 inline mr-1" /> Email
              </label>
              <input type="email" value={user?.email || ""} disabled className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone Number
              </label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alternate Email</label>
              <input type="email" value={alternateEmail} onChange={(e) => setAlternateEmail(e.target.value)} placeholder="personal@email.com" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
          </div>
        </SettingsSection>

        {/* Emergency Contact */}
        <SettingsSection title="Emergency Contact" icon={<Phone className="h-5 w-5 text-red-500" />} description="Person to contact in case of emergency">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
              <input type="text" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                <select value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">Select...</option>
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* UI Preferences */}
        <SettingsSection title="UI Preferences" icon={<Palette className="h-5 w-5 text-blue-500" />} description="Customize your dashboard appearance">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Theme</label>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-colors capitalize ${
                      theme === t
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-black/40 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-primary/50"
                    }`}
                  >
                    {t === "light" && <Sun className="h-3.5 w-3.5" />}
                    {t === "dark" && <Moon className="h-3.5 w-3.5" />}
                    {t === "system" && <Palette className="h-3.5 w-3.5" />}
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">Compact Mode</span>
                <span className="text-[11px] text-slate-500">Show more data in less space</span>
              </div>
              <button type="button" onClick={() => setCompactMode(!compactMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${compactMode ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${compactMode ? "translate-x-6" : "translate-x-1"}`} />
              </button>
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
      )}
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
