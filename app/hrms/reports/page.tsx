"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  DollarSign,
  FileText,
  Calendar,
  Briefcase,
  Download,
  RefreshCw,
  Search,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

interface ReportSummaryItem {
  label: string;
  value: string;
  color?: string;
}

interface ReportColumn {
  key: string;
  label: string;
}

interface ReportData {
  title: string;
  summary: ReportSummaryItem[];
  tableData: Record<string, any>[];
  columns: ReportColumn[];
  filename: string;
}

const REPORT_TABS = [
  { id: "attendance", label: "Attendance Summary", icon: Clock },
  { id: "leaves", label: "Leave Analytics", icon: FileText },
  { id: "payroll", label: "Payroll Disbursal", icon: DollarSign },
  { id: "recruitment", label: "Recruitment & Jobs", icon: Briefcase },
  { id: "holidays", label: "Holiday Calendar", icon: Calendar },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("attendance");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReport = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrm/v2/reports?type=${type}`);
      if (res.ok) {
        const json = await res.json();
        setReport(json.data || null);
      } else {
        setReport(null);
      }
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, fetchReport]);

  const exportCSV = () => {
    if (!report || !report.tableData.length) return;
    const headers = report.columns.map((c) => c.label).join(",");
    const rows = report.tableData.map((row) =>
      report.columns
        .map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${report.filename || activeTab}-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = (report?.tableData || []).filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Reports">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive organizational summaries, operational audit metrics, and CSV data exports."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchReport(activeTab)}
            disabled={loading}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "motion-safe:animate-spin motion-reduce:animate-none" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={exportCSV}
            disabled={loading || !report?.tableData.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 mb-6 overflow-x-auto">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearch("");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card border border-border text-muted hover:text-dark dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center motion-safe:animate-pulse motion-reduce:animate-none">
          <p className="text-sm text-muted">Compiling {activeTab} analytics…</p>
        </div>
      ) : !report ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted mx-auto mb-3" />
          <p className="text-foreground font-semibold">No report generated</p>
          <p className="text-xs text-muted mt-1">HR-level permissions required to inspect this dataset.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {report.summary && report.summary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {report.summary.map((s, idx) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card rounded-xl border border-border p-4 flex flex-col justify-between"
                >
                  <p className="text-xs text-muted truncate">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {s.value}
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Search bar inside report */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                placeholder="Search across report records..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted">
              Showing {filteredData.length} of {report.tableData.length} records
            </p>
          </div>

          {/* Report Data Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {report.columns.map((col) => (
                      <th
                        key={col.key}
                        className="py-3 px-4 font-semibold text-foreground text-xs"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={report.columns.length}
                        className="py-8 text-center text-muted"
                      >
                        No matching records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-muted/10 transition-colors"
                      >
                        {report.columns.map((col) => {
                          const val = row[col.key];
                          const isStatus =
                            col.key.toLowerCase().includes("status");
                          return (
                            <td key={col.key} className="py-3 px-4 text-foreground">
                              {isStatus ? (
                                <Badge
                                  variant={
                                    String(val).toLowerCase() === "present" ||
                                    String(val).toLowerCase() === "completed" ||
                                    String(val).toLowerCase() === "approved"
                                      ? "success"
                                      : String(val).toLowerCase() === "late" ||
                                        String(val).toLowerCase() === "pending" ||
                                        String(val).toLowerCase() === "processing"
                                      ? "warning"
                                      : "info"
                                  }
                                  size="sm"
                                >
                                  {String(val)}
                                </Badge>
                              ) : (
                                String(val ?? "—")
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
