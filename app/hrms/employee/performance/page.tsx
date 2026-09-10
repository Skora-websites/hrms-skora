"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Target,
  Clock,
  Award,
  Activity,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

interface PerformanceData {
  tasksCompleted: number;
  totalTasks: number;
  hoursLogged: number;
  attendanceRate: number;
  onTimeRate: number;
  overallScore: number;
  monthlyScores: { month: string; score: number }[];
}

export default function EmployeePerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/performance/mine");
      if (res.ok) setData((await res.json()).data || null);
    } catch { /* empty */ }
    setLoading(false);
  };

  return (
    <AppShell title="My Performance">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Performance</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Track your KPIs, task completion &amp; attendance metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Target className="h-5 w-5 text-primary" />}
          label="Task Completion"
          value={data ? `${Math.round((data.tasksCompleted / Math.max(data.totalTasks, 1)) * 100)}%` : "—"}
          sub={`${data?.tasksCompleted || 0} / ${data?.totalTasks || 0}`}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          label="Hours Logged"
          value={data?.hoursLogged?.toString() || "—"}
          sub="This month"
          accent="text-yellow-600 dark:text-yellow-400"
        />
        <KpiCard
          icon={<Activity className="h-5 w-5 text-emerald-500" />}
          label="Attendance Rate"
          value={data ? `${Math.round(data.attendanceRate)}%` : "—"}
          sub="Days present"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={<Award className="h-5 w-5 text-blue-500" />}
          label="Overall Score"
          value={data?.overallScore?.toString() || "—"}
          sub={data && data.overallScore >= 80 ? "Excellent" : data && data.overallScore >= 50 ? "Good" : "Needs Improvement"}
          accent={data && data.overallScore >= 80 ? "text-emerald-600" : data && data.overallScore >= 50 ? "text-yellow-600" : "text-red-600"}
        />
      </div>

      {/* Monthly Trend */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Monthly Performance Trend
        </h3>
        {!data || data.monthlyScores.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            Performance data will appear as you complete tasks and log attendance.
          </div>
        ) : (
          <div className="space-y-3">
            {data.monthlyScores.map((ms) => (
              <div key={ms.month} className="flex items-center gap-4 text-xs">
                <span className="w-20 font-semibold text-slate-700 dark:text-slate-300">{ms.month}</span>
                <div className="flex-1 h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ms.score >= 80 ? "bg-emerald-500" : ms.score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(ms.score, 100)}%` }}
                  />
                </div>
                <span className={`font-mono font-extrabold w-10 text-right ${ms.score >= 80 ? "text-emerald-600" : ms.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {ms.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Details */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-500" /> Attendance Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 text-center">
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{data ? Math.round(data.attendanceRate) : 0}%</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">On-Time Attendance</p>
          </div>
          <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/5 border border-yellow-200 dark:border-yellow-500/20 text-center">
            <p className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{data ? Math.round(data.onTimeRate) : 0}%</p>
            <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">Punch Before 10:30 AM</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 text-center">
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{data?.hoursLogged || 0}h</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Total Hours This Month</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      <p className={`text-[10px] mt-0.5 font-semibold ${accent || "text-slate-500"}`}>{sub}</p>
    </div>
  );
}
