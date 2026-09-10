"use client";

import { AppShell } from "@/components/layout/app-shell";
import { BarChart3, Users, Clock, DollarSign, FileText } from "lucide-react";

const REPORTS = [
  { title: "Attendance Summary", description: "Monthly attendance report with present/absent/late/WFH breakdown", icon: Clock, href: "/hrms/attendance" },
  { title: "Payroll Report", description: "Salary disbursement and deduction report by department", icon: DollarSign, href: "/hrms/payroll" },
  { title: "Employee Directory", description: "Complete employee listing with roles, departments, and status", icon: Users, href: "/hrms/employees" },
  { title: "Leave Analytics", description: "Leave utilization, balance, and trends across the organization", icon: FileText, href: "/hrms/leaves" },
  { title: "Project Status", description: "Project progress, task completion, and team performance", icon: BarChart3, href: "/hrms/projects" },
];

export default function ReportsPage() {
  return (
    <AppShell title="Reports">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View and export organizational reports</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <a key={r.title} href={r.href} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 hover:border-primary/50 transition-colors group">
            <r.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{r.title}</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.description}</p>
          </a>
        ))}
      </div>
    </AppShell>
  );
}
