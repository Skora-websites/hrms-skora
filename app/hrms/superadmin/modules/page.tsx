"use client";

import { useState, useEffect } from "react";
import { Settings, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface Tenant {
  id: string;
  name: string;
  modulesEnabled: { pms: boolean; ats: boolean; payroll: boolean };
}

interface ModuleDef {
  key: string;
  label: string;
  description: string;
}

const MODULES: ModuleDef[] = [
  { key: "pms", label: "Project Management (PMS)", description: "Task boards, Gantt charts, timesheets, and project budgets" },
  { key: "ats", label: "Applicant Tracking (ATS)", description: "Job postings, candidate pipeline, interview scheduling" },
  { key: "payroll", label: "Payroll System", description: "Salary processing, deductions, payslip generation" },
];

export default function SuperAdminModulesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/tenants");
      if (res.ok) setTenants((await res.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const toggleModule = async (tenantId: string, moduleKey: string, currentValue: boolean) => {
    setSaving(`${tenantId}-${moduleKey}`);
    try {
      await fetch(`/api/hrm/v2/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`modulesEnabled.${moduleKey}`]: !currentValue }),
      });
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId
            ? { ...t, modulesEnabled: { ...t.modulesEnabled, [moduleKey]: !currentValue } }
            : t
        )
      );
    } catch { /* empty */ }
    setSaving(null);
  };

  return (
    <AppShell title="Global Module Config">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Global Module Configuration</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enable or disable modules per tenant across the platform
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500 text-xs">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
          No tenants registered yet. Create a tenant first from the dashboard.
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((t) => (
            <div key={t.id} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base">{t.name}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODULES.map((mod) => {
                  const enabled = t.modulesEnabled?.[mod.key as keyof typeof t.modulesEnabled] ?? false;
                  const isSavingThis = saving === `${t.id}-${mod.key}`;
                  return (
                    <div key={mod.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{mod.label}</span>
                        <span className="text-[10px] text-slate-500">{mod.description}</span>
                      </div>
                      <button
                        onClick={() => toggleModule(t.id, mod.key, enabled)}
                        disabled={isSavingThis}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
