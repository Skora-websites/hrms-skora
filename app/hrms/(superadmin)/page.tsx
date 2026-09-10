import { AppShell } from "@/components/layout/app-shell";
import { getTenants } from "@/lib/db/tenants";
import { Building2, Users, ShieldCheck, DollarSign, ArrowUpRight, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SuperadminOverviewPage() {
  const tenants = await getTenants();
  const activeTenants = tenants.filter((t) => t.isActive);

  return (
    <AppShell title="Superadmin Platform Overview">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Superadmin Control Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-Tenant Platform Health & System Overview</p>
        </div>
        <Link href="/hrms/superadmin/tenants">
          <Button className="bg-primary text-white hover:bg-primary/90 gap-2 font-bold shadow-md">
            <Building2 className="h-4 w-4" /> Manage Tenants
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Tenants</span>
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{activeTenants.length}</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <ArrowUpRight className="h-3 w-3" /> {tenants.length} total registered
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">System Uptime</span>
            <Activity className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">99.98%</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            All services operational
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">PMS Active Modules</span>
            <ShieldCheck className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {tenants.filter((t) => t.modulesEnabled?.pms).length}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">SaaS Tenants with PMS enabled</span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Monthly SaaS Revenue</span>
            <DollarSign className="h-5 w-5 text-cyan-500" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">₹1,45,000</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <ArrowUpRight className="h-3 w-3" /> +15.4% from last month
          </span>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4">Registered Organization Tenants</h3>

        {tenants.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-sm">
            No tenants registered yet. Create your first tenant company to start multi-tenant SaaS onboarding.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Company Name</th>
                  <th className="pb-3 font-semibold">Subscription Plan</th>
                  <th className="pb-3 font-semibold">PMS Module</th>
                  <th className="pb-3 font-semibold">Payroll Module</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {tenants.map((t) => (
                  <tr key={t._id?.toString()}>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">{t.name}</td>
                    <td className="py-3 uppercase text-primary font-mono font-semibold">{t.subscriptionTier || "Pro"}</td>
                    <td className="py-3">
                      {t.modulesEnabled?.pms ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                      ) : (
                        <span className="text-slate-500">Disabled</span>
                      )}
                    </td>
                    <td className="py-3">
                      {t.modulesEnabled?.payroll ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                      ) : (
                        <span className="text-slate-500">Disabled</span>
                      )}
                    </td>
                    <td className="py-3">
                      {t.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 border border-red-500/20">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
