"use client";

import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Printer,
  Loader2,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Clock,
  Calendar,
  Sun,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
} from "lucide-react";
import { toCsv, downloadCsv, downloadJson, formatDate } from "@/lib/utils";
import type { DashboardStats } from "@/types";

// ── Report Types that require the HR API (not client-side) ──
const HR_API_REPORT_TYPES = new Set([
  "attendance", "leaves", "payroll", "holidays", "recruitment",
]);

const COMPREHENSIVE_REPORT_TYPES = new Set([
  "comprehensive",
]);

export interface ReportType {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const REPORT_TYPES: ReportType[] = [
  // ── CRM Reports (client-side, from DashboardStats) ──
  {
    id: "revenue",
    label: "Revenue Report",
    description: "Revenue vs costs, profit trends, and key financial metrics",
    icon: DollarSign,
    color: "text-primary",
  },
  {
    id: "leads",
    label: "Leads Report",
    description: "Lead acquisition sources, conversion rates, and pipeline",
    icon: TrendingUp,
    color: "text-info",
  },
  {
    id: "deals",
    label: "Deals Report",
    description: "Deal stages, won/lost analysis, and deal values",
    icon: Target,
    color: "text-success",
  },

  // ── HR Reports (server-side, from API) ──
  {
    id: "employees",
    label: "Employee Report",
    description: "Workforce composition, role breakdown, and status distribution",
    icon: Users,
    color: "text-warning",
  },
  {
    id: "attendance",
    label: "Attendance Report",
    description: "Daily attendance stats, presence vs absence analysis",
    icon: Clock,
    color: "text-info",
  },
  {
    id: "leaves",
    label: "Leave Report",
    description: "Leave requests, balances, and utilization",
    icon: Calendar,
    color: "text-success",
  },
  {
    id: "payroll",
    label: "Payroll Report",
    description: "Pay groups, salary components, and payroll history",
    icon: DollarSign,
    color: "text-primary",
  },
  {
    id: "holidays",
    label: "Holiday Report",
    description: "Holiday plans, scheduled holidays, and upcoming observances",
    icon: Sun,
    color: "text-warning",
  },
  {
    id: "performance",
    label: "Performance Report",
    description: "Goals, reviews, feedback, and KPIs",
    icon: BarChart3,
    color: "text-danger",
  },
  {
    id: "recruitment",
    label: "Recruitment Report",
    description: "Job postings, candidates, interviews, and offers",
    icon: Users,
    color: "text-info",
  },
  {
    id: "comprehensive",
    label: "Comprehensive Report",
    description: "Full business overview combining HR metrics",
    icon: FileText,
    color: "text-primary",
  },
];

// ── Report Data Helpers ─────────────────────────────────

function buildRevenueReport(stats: DashboardStats) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const monthlyData = months.map((name, i) => ({
    month: name,
    revenue: stats.monthlyRevenue?.[i] || 0,
    costs: Math.round((stats.monthlyRevenue?.[i] || 0) * 0.6),
    profit: Math.round((stats.monthlyRevenue?.[i] || 0) * 0.4),
  }));

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = monthlyData.reduce((s, m) => s + m.profit, 0);

  return {
    title: "Revenue Report",
    summary: [
      { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "text-primary" },
      { label: "Total Profit", value: `$${totalProfit.toLocaleString()}`, color: "text-success" },
      { label: "Profit Margin", value: totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "0%", color: "text-info" },
    ],
    tableData: monthlyData,
    columns: [
      { key: "month" as const, label: "Month" },
      { key: "revenue" as const, label: "Revenue ($)" },
      { key: "costs" as const, label: "Costs ($)" },
      { key: "profit" as const, label: "Profit ($)" },
    ],
    filename: `revenue-report-${formatDate(new Date(), { year: "numeric" })}`,
  };
}

function buildLeadsReport(stats: DashboardStats) {
  const leadsBySource = stats.leadsBySource || [];
  const totalLeads = leadsBySource.reduce((s, l) => s + l.value, 0);

  return {
    title: "Leads Report",
    summary: [
      { label: "Total Leads", value: String(stats.activeLeads ?? 0), color: "text-info" },
      { label: "Conversion Rate", value: `${stats.conversionRate ?? 0}%`, color: "text-success" },
      { label: "Active Sources", value: String(leadsBySource.length), color: "text-warning" },
    ],
    tableData: leadsBySource.map((s) => ({ source: s.name, count: s.value })),
    columns: [
      { key: "source" as const, label: "Source" },
      { key: "count" as const, label: "Lead Count" },
    ],
    filename: `leads-report-${formatDate(new Date(), { year: "numeric" })}`,
  };
}

function buildDealsReport(stats: DashboardStats) {
  const dealsByStage = stats.dealsByStage || [];
  const totalValue = dealsByStage.reduce((s, d) => s + d.amount, 0);
  const wonDeals = dealsByStage.find((d) => d.name === "Closed Won");

  return {
    title: "Deals Report",
    summary: [
      { label: "Total Deals Value", value: `$${totalValue.toLocaleString()}`, color: "text-primary" },
      { label: "Won Deals", value: String(wonDeals?.value ?? 0), color: "text-success" },
      { label: "Won Value", value: `$${(wonDeals?.amount ?? 0).toLocaleString()}`, color: "text-success" },
    ],
    tableData: dealsByStage,
    columns: [
      { key: "name" as const, label: "Stage" },
      { key: "value" as const, label: "Deal Count" },
      { key: "amount" as const, label: "Value ($)" },
    ],
    filename: `deals-report-${formatDate(new Date(), { year: "numeric" })}`,
  };
}

function buildEmployeeReport(stats: DashboardStats) {
  return {
    title: "Employee Report",
    summary: [
      { label: "Total Employees", value: String(stats.totalEmployees ?? 0), color: "text-primary" },
      { label: "Active", value: String(stats.activeEmployees ?? 0), color: "text-success" },
      { label: "On Probation", value: String(stats.probationEmployees ?? 0), color: "text-warning" },
      { label: "New Hires (This Month)", value: String(stats.newHiresThisMonth ?? 0), color: "text-info" },
    ],
    tableData: [
      { metric: "Total Employees", value: stats.totalEmployees ?? 0 },
      { metric: "Active", value: stats.activeEmployees ?? 0 },
      { metric: "On Probation", value: stats.probationEmployees ?? 0 },
      { metric: "New Hires This Month", value: stats.newHiresThisMonth ?? 0 },
    ],
    columns: [
      { key: "metric" as const, label: "Metric" },
      { key: "value" as const, label: "Count" },
    ],
    filename: `employee-report-${formatDate(new Date(), { year: "numeric" })}`,
  };
}

function buildPerformanceReport(stats: DashboardStats) {
  const metrics = [
    { metric: "Total Revenue", value: `$${(stats.totalRevenue ?? 0).toLocaleString()}` },
    { metric: "Active Leads", value: String(stats.activeLeads ?? 0) },
    { metric: "Won Deals", value: String(stats.wonDeals ?? 0) },
    { metric: "Conversion Rate", value: `${stats.conversionRate ?? 0}%` },
    { metric: "Total Employees", value: String(stats.totalEmployees ?? 0) },
  ];

  return {
    title: "Performance Report",
    summary: metrics.slice(0, 3).map((m) => ({
      label: m.metric,
      value: m.value,
      color: "text-primary" as const,
    })),
    tableData: metrics,
    columns: [
      { key: "metric" as const, label: "Metric" },
      { key: "value" as const, label: "Value" },
    ],
    filename: `performance-report-${formatDate(new Date(), { year: "numeric" })}`,
  };
}

type ReportData = ReturnType<
  | typeof buildRevenueReport
  | typeof buildLeadsReport
  | typeof buildDealsReport
  | typeof buildEmployeeReport
  | typeof buildPerformanceReport
>;

// ── Report Builder Registry ─────────────────────────────

const REPORT_BUILDERS: Record<
  string,
  (stats: DashboardStats) => ReportData
> = {
  revenue: buildRevenueReport,
  leads: buildLeadsReport,
  deals: buildDealsReport,
  employees: buildEmployeeReport,
  performance: buildPerformanceReport,
};

// ── Component ────────────────────────────────────────────

interface ReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: DashboardStats | null;
  statsLoading: boolean;
}

export function ReportGenerator({
  open,
  onOpenChange,
  stats,
  statsLoading,
}: ReportGeneratorProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset state when dialog opens/closes.
  // Also aborts any in-flight generation to prevent stale state updates.
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        abortRef.current?.abort();
        abortRef.current = null;
        setSelectedReport(null);
        setGenerated(false);
        setReportData(null);
        setGenerating(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle report generation
  const handleGenerate = useCallback(async () => {
    if (!selectedReport) return;

    // Cancel any prior in-flight generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setGenerating(true);
    setGenerated(false);
    setReportData(null);

    // Brief delay for UX feedback — bails early if aborted
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 600);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });

    if (signal.aborted) return;

    try {
      let data: ReportData;

      // HR / Comprehensive reports come from the server-side API
      if (HR_API_REPORT_TYPES.has(selectedReport) || COMPREHENSIVE_REPORT_TYPES.has(selectedReport)) {
        const res = await fetch(`/api/hrm/v2/reports?type=${selectedReport}`, {
          signal,
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed: ${res.status}`);
        }
        const json = await res.json();
        data = json.data as ReportData;
      }
      // CRM reports use client-side DashboardStats
      else {
        if (!stats) {
          throw new Error("Dashboard data is required for CRM reports. Please wait for it to load.");
        }
        const builder = REPORT_BUILDERS[selectedReport];
        if (!builder) throw new Error(`Unknown report type: ${selectedReport}`);
        data = builder(stats) as ReportData;
      }

      setReportData(data);
      setGenerated(true);
      toastSuccess(`${data.title} has been generated successfully.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      if (!signal.aborted) setGenerating(false);
    }
  }, [selectedReport, stats]);

  // Export as CSV
  const handleExportCsv = useCallback(() => {
    if (!reportData) return;
    setExportLoading("csv");
    try {
      const csv = toCsv(reportData.tableData as Record<string, unknown>[], reportData.columns as any);
      downloadCsv(csv, reportData.filename);
      toastSuccess(`${reportData.filename}.csv has been downloaded.`);
    } catch {
      toastError("Failed to export CSV. Please try again.");
    } finally {
      setExportLoading(null);
    }
  }, [reportData]);

  // Export as JSON
  const handleExportJson = useCallback(() => {
    if (!reportData) return;
    setExportLoading("json");
    try {
      downloadJson(
        {
          title: reportData.title,
          generatedAt: new Date().toISOString(),
          summary: reportData.summary,
          data: reportData.tableData,
        },
        reportData.filename
      );
      toastSuccess(`${reportData.filename}.json has been downloaded.`);
    } catch {
      toastError("Failed to export JSON. Please try again.");
    } finally {
      setExportLoading(null);
    }
  }, [reportData]);

  // Print (PDF via browser)
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Step 1: Select Report Type ────────────────────────

  const renderSelectionStep = () => (
    <div className="space-y-6">
      {/* Report Types */}
      <div>
        <h4 className="text-sm font-semibold text-dark dark:text-white mb-3">
          Select Report Type
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedReport === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedReport(type.id)}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] shadow-sm shadow-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-primary text-white"
                      : "bg-muted/30 text-muted"
                  } transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isSelected
                        ? "text-primary"
                        : "text-dark dark:text-white"
                    }`}
                  >
                    {type.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {type.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

  {/* Action */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button variant="ghost" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!selectedReport || generating || statsLoading}
          loading={generating}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-1.5" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Report Preview ─────────────────────────────

  const renderPreviewStep = () => {
    if (!reportData) return null;

    const Icon =
      REPORT_TYPES.find((t) => t.id === selectedReport)?.icon || FileText;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-dark dark:text-white">
                {reportData.title}
              </h4>
              <p className="text-xs text-muted">
                Generated {formatDate(new Date())}
              </p>
            </div>
          </div>
          <Badge variant="subtle-success" size="sm">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reportData.summary.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <p className="text-xs text-muted font-medium mb-1">
                {item.label}
              </p>
              <p className={`text-lg font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {reportData.columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.tableData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`border-b border-border/50 last:border-0 ${
                    rowIdx % 2 === 0
                      ? "bg-card"
                      : "bg-muted/10"
                  }`}
                >
                  {reportData.columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-3 text-sm text-dark dark:text-white whitespace-nowrap"
                    >
                      {String(row[col.key as keyof typeof row] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {reportData.tableData.length === 0 && (
                <tr>
                  <td
                    colSpan={reportData.columns.length}
                    className="px-4 py-8 text-center text-sm text-muted"
                  >
                    <AlertCircle className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    No data available for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        <p className="text-xs text-muted text-right">
          {reportData.tableData.length} row
          {reportData.tableData.length !== 1 ? "s" : ""}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => {
              setGenerated(false);
              setReportData(null);
            }}
          >
            Back to Selection
          </Button>
          <div className="flex items-center gap-2">        <Button variant="ghost" size="sm" onClick={handleExportJson}
              loading={exportLoading === "json"}
              disabled={!!exportLoading}
            >
              <FileJson className="h-4 w-4 mr-1.5" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              loading={exportLoading === "csv"}
              disabled={!!exportLoading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print / PDF
            </Button>

          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            {generated && reportData
              ? reportData.title
              : "Generate Report"}
          </DialogTitle>
          <DialogDescription>
            {generated && reportData
              ? "Preview and export your generated report."
              : "Select a report type and configure options to generate a detailed business report."}
          </DialogDescription>
        </DialogHeader>

        {statsLoading && !stats ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted">Loading dashboard data...</p>
          </div>
        ) : !stats ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted mb-3" />
            <p className="text-sm font-semibold text-dark dark:text-white mb-1">
              No Data Available
            </p>
            <p className="text-xs text-muted max-w-sm">
              Dashboard data is required to generate reports. Please ensure the
              dashboard has loaded correctly.
            </p>
          </div>
        ) : !generated ? (
          renderSelectionStep()
        ) : (
          renderPreviewStep()
        )}
      </DialogContent>
    </Dialog>
  );
}
