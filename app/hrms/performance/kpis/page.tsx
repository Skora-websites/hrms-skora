"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Mock Data ───────────────────────────────────────────

const MOCK_KPIS: any[] = [];

const categoryColors: Record<string, string> = {
  productivity: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  quality: "bg-success/10 text-success border-success/20",
  attendance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  sales: "bg-primary/10 text-primary border-primary/20",
  customer_satisfaction: "bg-danger/10 text-danger border-danger/20",
  other: "bg-gray-100 dark:bg-gray-800 text-muted border-gray-200 dark:border-gray-700",
};

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  on_track: "primary",
  behind: "warning",
  achieved: "success",
  not_met: "danger",
};

const statusIcons: Record<string, React.ReactNode> = {
  on_track: <TrendingUp className="h-3.5 w-3.5" />,
  behind: <TrendingDown className="h-3.5 w-3.5" />,
  achieved: <CheckCircle2 className="h-3.5 w-3.5" />,
  not_met: <AlertCircle className="h-3.5 w-3.5" />,
};

function formatValue(value: number, unit: string): string {
  if (unit === "$") return `$${value.toLocaleString()}`;
  if (unit === "%") return `${value}%`;
  if (unit === "hours") return `${value}h`;
  if (unit === "score") return value.toFixed(1);
  return `${value}`;
}

export default function KpisPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_KPIS.filter((k) => {
    const q = search.toLowerCase();
    return !search || k.name.toLowerCase().includes(q) || k.employee.toLowerCase().includes(q) || k.category.toLowerCase().includes(q);
  });

  return (
    <AppShell title="KPIs">
      <PageHeader title="KPI Tracking" description="Monitor key performance indicators across the organization." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search KPIs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No KPIs found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((kpi, idx) => {
            const progress = kpi.target > 0 ? Math.min(Math.round((kpi.actual / kpi.target) * 100), 100) : 0;
            return (
              <motion.div
                key={kpi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-dark dark:text-white">{kpi.name}</h3>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users className="h-3 w-3" />{kpi.employee}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${categoryColors[kpi.category] || categoryColors.other}`}>
                          {kpi.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        </span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Target className="h-3 w-3" />Target: {formatValue(kpi.target, kpi.unit)}
                        </span>
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />{kpi.period}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-2 max-w-xs">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress >= 100 ? "bg-success" :
                              progress >= 70 ? "bg-primary" :
                              progress >= 40 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-dark dark:text-white">
                          {formatValue(kpi.actual, kpi.unit)}
                          <span className="text-muted font-normal"> / {formatValue(kpi.target, kpi.unit)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted font-medium">Weight: {kpi.weight}%</span>
                    <Badge variant={statusColors[kpi.status]} size="sm">
                      <span className="flex items-center gap-1">
                        {statusIcons[kpi.status]}
                        {kpi.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                    </Badge>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
