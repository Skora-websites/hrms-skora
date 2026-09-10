"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Target,
  Search,
  Plus,
  Users,
  Calendar,
  TrendingUp,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Mock Data ───────────────────────────────────────────

const MOCK_GOALS: any[] = [];

const statusBadge: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "info",
  in_progress: "primary",
  achieved: "success",
  partially_achieved: "warning",
  not_achieved: "danger",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3.5 w-3.5" />,
  in_progress: <TrendingUp className="h-3.5 w-3.5" />,
  achieved: <CheckCircle2 className="h-3.5 w-3.5" />,
  partially_achieved: <AlertCircle className="h-3.5 w-3.5" />,
  not_achieved: <AlertCircle className="h-3.5 w-3.5" />,
};

export default function GoalsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = MOCK_GOALS.filter((g) => {
    const q = search.toLowerCase();
    return !search || g.title.toLowerCase().includes(q) || g.employee.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Goals">
      <PageHeader title="Goals" description="Manage and track employee goals and OKRs.">
        <Button onClick={() => router.push("/performance")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search goals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Target className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No goals found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((goal, idx) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Target className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-dark dark:text-white">{goal.title}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />{goal.employee}
                      </span>
                      <span className="text-xs text-muted">{goal.category}</span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{goal.targetDate}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2 max-w-xs">
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            goal.progress >= 100 ? "bg-success" :
                            goal.progress >= 60 ? "bg-primary" :
                            goal.progress >= 30 ? "bg-warning" : "bg-danger"
                          }`}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-dark dark:text-white">{goal.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    goal.priority === "critical" ? "bg-danger/10 text-danger" :
                    goal.priority === "high" ? "bg-warning/10 text-warning" :
                    goal.priority === "medium" ? "bg-primary/10 text-primary" :
                    "bg-gray-100 dark:bg-gray-800 text-muted"
                  }`}>
                    {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)}
                  </span>
                  <Badge variant={statusBadge[goal.status]} size="sm">
                    <span className="flex items-center gap-1">
                      {statusIcons[goal.status]}
                      {goal.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
