"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DollarSign,
  Receipt,
  Download,
  Users,
  TrendingUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Eye,
  X,
  Plus,
  Trash2,
  Sliders,
  Layers,
} from "lucide-react";

interface PayrollRun {
  id: string;
  _id?: string;
  payGroupId: string;
  payGroupName?: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalEmployees: number;
  totalGross: number;
  totalGrossPay?: number;
  totalDeductions: number;
  totalNet: number;
  totalNetPay?: number;
  processedBy: string;
  processedAt: string;
  createdAt: string;
}

interface PayrollTransaction {
  id?: string;
  _id?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  employeeCode?: string;
  department?: string;
  designation?: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  earnings?: Record<string, number>;
  deductions?: Record<string, number>;
  status: string;
}

export default function HrAdminPayrollPage() {
  const { user } = useAuth();
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedRunForView, setSelectedRunForView] = useState<PayrollRun | null>(null);
  const [runTransactions, setRunTransactions] = useState<PayrollTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [periodStart, setPeriodStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [periodEnd, setPeriodEnd] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]
  );

  const [activeTab, setActiveTab] = useState<"runs" | "components" | "pay_groups">("runs");
  const [components, setComponents] = useState<any[]>([]);
  const [payGroups, setPayGroups] = useState<any[]>([]);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [showPayGroupModal, setShowPayGroupModal] = useState(false);

  const [newComponent, setNewComponent] = useState({
    name: "",
    code: "",
    type: "earning" as "earning" | "deduction",
    calculationType: "fixed" as "fixed" | "percentage_of_basic" | "attendance_based",
    defaultPercentage: 0,
    isTaxable: true,
    isStatutory: false,
    status: "active" as "active" | "inactive",
    sortOrder: 1,
  });

  const [newPayGroup, setNewPayGroup] = useState({
    name: "",
    description: "",
    frequency: "monthly" as "monthly" | "bi_weekly" | "weekly",
    payDate: 28,
    processingType: "manual" as "auto" | "manual",
    status: "active" as "active" | "inactive",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadPayroll();
    loadComponents();
    loadPayGroups();
  }, []);

  const loadComponents = async () => {
    try {
      const res = await fetch("/api/hrm/v2/payroll?type=components");
      if (res.ok) {
        const data = await res.json();
        setComponents(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      /* ignore */
    }
  };

  const loadPayGroups = async () => {
    try {
      const res = await fetch("/api/hrm/v2/payroll?type=pay-groups");
      if (res.ok) {
        const data = await res.json();
        setPayGroups(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      /* ignore */
    }
  };

  const handleCreateComponent = async () => {
    if (!newComponent.name || !newComponent.code) {
      showToast("Name and Code are required", "error");
      return;
    }
    try {
      const res = await fetch("/api/hrm/v2/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_component", ...newComponent }),
      });
      if (res.ok) {
        showToast("Salary component created successfully");
        setShowComponentModal(false);
        setNewComponent({
          name: "",
          code: "",
          type: "earning",
          calculationType: "fixed",
          defaultPercentage: 0,
          isTaxable: true,
          isStatutory: false,
          status: "active",
          sortOrder: 1,
        });
        loadComponents();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create component", "error");
      }
    } catch {
      showToast("Failed to create component", "error");
    }
  };

  const handleDeleteComponent = async (id: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/payroll?id=${id}&type=component`, { method: "DELETE" });
      if (res.ok) {
        showToast("Salary component deleted");
        loadComponents();
      } else {
        showToast("Failed to delete component", "error");
      }
    } catch {
      showToast("Failed to delete component", "error");
    }
  };

  const handleCreatePayGroup = async () => {
    if (!newPayGroup.name) {
      showToast("Name is required", "error");
      return;
    }
    try {
      const res = await fetch("/api/hrm/v2/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_pay_group", ...newPayGroup }),
      });
      if (res.ok) {
        showToast("Pay group created successfully");
        setShowPayGroupModal(false);
        setNewPayGroup({
          name: "",
          description: "",
          frequency: "monthly",
          payDate: 28,
          processingType: "manual",
          status: "active",
        });
        loadPayGroups();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create pay group", "error");
      }
    } catch {
      showToast("Failed to create pay group", "error");
    }
  };

  const handleDeletePayGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/hrm/v2/payroll?id=${id}&type=pay-group`, { method: "DELETE" });
      if (res.ok) {
        showToast("Pay group deleted");
        loadPayGroups();
      } else {
        showToast("Failed to delete pay group", "error");
      }
    } catch {
      showToast("Failed to delete pay group", "error");
    }
  };

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/payroll?type=runs");
      if (res.ok) {
        const data = await res.json();
        const runs = Array.isArray(data.data) ? data.data : [];
        setPayrollRuns(
          runs.map((r: any) => ({
            ...r,
            id: r.id || r._id,
            totalGross: r.totalGross || r.totalGrossPay || 0,
            totalNet: r.totalNet || r.totalNetPay || 0,
            totalDeductions: r.totalDeductions || 0,
          }))
        );
      }
    } catch {
      showToast("Error loading payroll history", "error");
    }
    setLoading(false);
  };

  const handleRunPayroll = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/hrm/v2/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          payGroupId: "default",
          periodStart,
          periodEnd,
          processedBy: user?.id || "",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Payroll cycle executed successfully for all active employees!");
        setShowRunModal(false);
        loadPayroll();
      } else {
        showToast(data.error || "Failed to process payroll", "error");
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to process payroll", "error");
    }
    setProcessing(false);
  };

  const handleViewBreakdown = async (run: PayrollRun) => {
    setSelectedRunForView(run);
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/hrm/v2/payroll?type=transactions&id=${run.id}`);
      if (res.ok) {
        const data = await res.json();
        setRunTransactions(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      showToast("Failed to load run details", "error");
    }
    setLoadingTransactions(false);
  };

  const handleExport = async (run: PayrollRun) => {
    setExportingRunId(run.id);
    try {
      // Fetch itemized transactions for this run
      const res = await fetch(`/api/hrm/v2/payroll?type=transactions&id=${run.id}`);
      let transactions: PayrollTransaction[] = [];
      if (res.ok) {
        const json = await res.json();
        transactions = Array.isArray(json.data) ? json.data : [];
      }

      const headers = [
        "Employee Name",
        "Email",
        "Employee Code",
        "Department",
        "Designation",
        "Period Start",
        "Period End",
        "Gross Pay (INR)",
        "Deductions (INR)",
        "Net Pay (INR)",
        "Status",
      ];

      let csvContent = "";
      if (transactions.length > 0) {
        const rows = transactions.map((t) => [
          `"${t.userName || "Employee"}"`,
          `"${t.userEmail || ""}"`,
          `"${t.employeeCode || ""}"`,
          `"${t.department || "General"}"`,
          `"${t.designation || "Staff"}"`,
          `"${run.periodStart ? new Date(run.periodStart).toLocaleDateString() : ""}"`,
          `"${run.periodEnd ? new Date(run.periodEnd).toLocaleDateString() : ""}"`,
          t.grossPay || 0,
          t.totalDeductions || 0,
          t.netPay || 0,
          `"${t.status || "Paid"}"`,
        ].join(","));

        csvContent = [headers.join(","), ...rows].join("\n");
      } else {
        // Fallback to summary row
        const row = [
          "All Employees",
          "N/A",
          "N/A",
          "All Departments",
          "All Staff",
          `"${run.periodStart ? new Date(run.periodStart).toLocaleDateString() : ""}"`,
          `"${run.periodEnd ? new Date(run.periodEnd).toLocaleDateString() : ""}"`,
          run.totalGross || 0,
          run.totalDeductions || 0,
          run.totalNet || 0,
          `"${run.status}"`,
        ].join(",");
        csvContent = [headers.join(","), row].join("\n");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-run-${run.id}-${run.periodStart ? run.periodStart.slice(0, 7) : "period"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Payroll report downloaded successfully!");
    } catch {
      showToast("Failed to generate payroll export", "error");
    }
    setExportingRunId(null);
  };

  const handleExportAll = () => {
    if (payrollRuns.length === 0) return;
    const headers = [
      "Run ID",
      "Pay Group",
      "Period Start",
      "Period End",
      "Employees Count",
      "Total Gross (INR)",
      "Total Deductions (INR)",
      "Total Net (INR)",
      "Status",
      "Processed At",
    ];
    const rows = payrollRuns.map((run) =>
      [
        `"${run.id}"`,
        `"${run.payGroupName || "Standard Monthly"}"`,
        `"${run.periodStart ? new Date(run.periodStart).toLocaleDateString() : "N/A"}"`,
        `"${run.periodEnd ? new Date(run.periodEnd).toLocaleDateString() : "N/A"}"`,
        run.totalEmployees || 0,
        run.totalGross || 0,
        run.totalDeductions || 0,
        run.totalNet || 0,
        `"${run.status}"`,
        `"${run.processedAt ? new Date(run.processedAt).toLocaleDateString() : "N/A"}"`,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-payroll-runs-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Master payroll summary downloaded!");
  };

  const totalPayroll = payrollRuns.reduce((sum, r) => sum + (r.totalNet || 0), 0);
  const totalRuns = payrollRuns.length;
  const latestRun = payrollRuns[0];

  return (
    <AppShell title="Payroll Management">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 motion-safe:animate-in motion-reduce:animate-none fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payroll Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Run end-of-month payroll, calculate statutory deductions, and export payslip archives
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 text-xs font-bold border-border"
            onClick={handleExportAll}
            disabled={payrollRuns.length === 0}
          >
            <Download className="h-4 w-4" /> Export All Runs
          </Button>
          <Button
            className="bg-primary text-white gap-2 font-bold text-xs"
            onClick={() => setShowRunModal(true)}
          >
            <Receipt className="h-4 w-4" /> Run Payroll
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("runs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150 ${
            activeTab === "runs"
              ? "bg-primary text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Payroll Cycles ({payrollRuns.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("components");
            loadComponents();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150 ${
            activeTab === "components"
              ? "bg-primary text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Salary Components ({components.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("pay_groups");
            loadPayGroups();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150 ${
            activeTab === "pay_groups"
              ? "bg-primary text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Layers className="h-4 w-4" />
          Pay Groups ({payGroups.length})
        </button>
      </div>

      {activeTab === "runs" && (
        <>
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground backdrop-blur-md">
          <DollarSign className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-extrabold">₹{totalPayroll.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total Payroll Disbursed</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground backdrop-blur-md">
          <Receipt className="h-5 w-5 text-blue-500 mb-2" />
          <p className="text-2xl font-extrabold">{totalRuns}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Payroll Runs Executed</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground backdrop-blur-md">
          <TrendingUp className="h-5 w-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-extrabold">{latestRun ? latestRun.status.toUpperCase() : "READY"}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Latest Cycle Status</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground backdrop-blur-md">
          <Users className="h-5 w-5 text-yellow-500 mb-2" />
          <p className="text-2xl font-extrabold">{latestRun?.totalEmployees ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active Employees on Payroll</p>
        </div>
      </div>

      {/* Payroll Runs Table */}
      <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Payroll Cycle History ({payrollRuns.length})
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-xs text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading payroll runs...
          </div>
        ) : payrollRuns.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border rounded-2xl text-slate-500 text-xs">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">No payroll runs yet</p>
            <p className="text-slate-500 mb-4">Click &quot;Run Payroll&quot; above to process payroll for all active employees.</p>
            <Button onClick={() => setShowRunModal(true)} className="bg-primary text-white font-bold text-xs">
              <Receipt className="h-4 w-4 mr-1.5" /> Run First Payroll
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <tr>
                  <th className="pb-3 pr-4">Pay Period</th>
                  <th className="pb-3 pr-4">Employees</th>
                  <th className="pb-3 pr-4">Gross Disbursed</th>
                  <th className="pb-3 pr-4">Deductions (PF/Tax)</th>
                  <th className="pb-3 pr-4">Net Salary Paid</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Processed Date</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {payrollRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="font-semibold">
                        {run.periodStart ? new Date(run.periodStart).toLocaleDateString() : "N/A"}
                      </span>
                      <span className="text-slate-400 mx-1">to</span>
                      <span className="font-semibold">
                        {run.periodEnd ? new Date(run.periodEnd).toLocaleDateString() : "N/A"}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 font-semibold">{run.totalEmployees || 0} Staff</td>
                    <td className="py-3.5 pr-4 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      ₹{(run.totalGross || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4 text-red-600 dark:text-red-400 font-semibold font-mono">
                      -₹{(run.totalDeductions || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4 font-extrabold text-primary font-mono text-sm">
                      ₹{(run.totalNet || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        run.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : run.status === "processing"
                          ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                      }`}>
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-500">
                      {run.processedAt ? new Date(run.processedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewBreakdown(run)}
                          className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300 hover:text-primary gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={exportingRunId === run.id}
                          onClick={() => handleExport(run)}
                          className="h-7 px-2.5 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1"
                        >
                          {exportingRunId === run.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Export CSV
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {/* ═══ SALARY COMPONENTS TAB ═══ */}
      {activeTab === "components" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" /> Configured Salary Components ({components.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Earnings, statutory allowances, and deductions configured for this organization</p>
            </div>
            <Button
              onClick={() => setShowComponentModal(true)}
              className="bg-primary text-white gap-2 font-bold text-xs"
            >
              <Plus className="h-4 w-4" /> Add Component
            </Button>
          </div>
          {components.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-2xl text-slate-500 text-xs">
              <Sliders className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">No custom salary components yet</p>
              <p className="text-slate-500 mb-4">Default baseline components (Basic, HRA, Special Allowance, PF, PT, TDS) are applied during payroll calculation.</p>
              <Button onClick={() => setShowComponentModal(true)} className="bg-primary text-white font-bold text-xs">
                <Plus className="h-4 w-4 mr-1.5" /> Create First Component
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="pb-3 pr-4">Component Name</th>
                    <th className="pb-3 pr-4">Code</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Calculation Method</th>
                    <th className="pb-3 pr-4">Statutory</th>
                    <th className="pb-3 pr-4">Taxable</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {components.map((c: any) => (
                    <tr key={c.id || c._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-bold">{c.name}</td>
                      <td className="py-3 pr-4 font-mono text-slate-500">{c.code}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.type === "earning"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}>
                          {c.type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{c.calculationType?.replace(/_/g, " ")}</td>
                      <td className="py-3 pr-4">
                        {c.isStatutory ? (
                          <span className="text-blue-500 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {c.isTaxable ? (
                          <span className="text-yellow-600 dark:text-yellow-400 font-semibold">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10">
                          {c.status || "active"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComponent(c.id || c._id)}
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ PAY GROUPS TAB ═══ */}
      {activeTab === "pay_groups" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" /> Configured Pay Groups ({payGroups.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Pay cycles and employee payment schedule groupings</p>
            </div>
            <Button
              onClick={() => setShowPayGroupModal(true)}
              className="bg-primary text-white gap-2 font-bold text-xs"
            >
              <Plus className="h-4 w-4" /> Add Pay Group
            </Button>
          </div>
          {payGroups.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border rounded-2xl text-slate-500 text-xs">
              <Layers className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="font-semibold text-sm mb-1 text-slate-800 dark:text-slate-200">No custom pay groups configured</p>
              <p className="text-slate-500 mb-4">All employees default to the Standard Monthly Pay Group, or create distinct pay groups.</p>
              <Button onClick={() => setShowPayGroupModal(true)} className="bg-primary text-white font-bold text-xs">
                <Plus className="h-4 w-4 mr-1.5" /> Create First Pay Group
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border text-slate-500 dark:text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="pb-3 pr-4">Group Name</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Frequency</th>
                    <th className="pb-3 pr-4">Pay Day</th>
                    <th className="pb-3 pr-4">Processing Type</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {payGroups.map((g: any) => (
                    <tr key={g.id || g._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-bold">{g.name}</td>
                      <td className="py-3 pr-4 text-slate-500">{g.description || "—"}</td>
                      <td className="py-3 pr-4 capitalize">{g.frequency || "monthly"}</td>
                      <td className="py-3 pr-4">{g.payDate || 28}th of month</td>
                      <td className="py-3 pr-4 capitalize">{g.processingType || "manual"}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10">
                          {g.status || "active"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePayGroup(g.id || g._id)}
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ RUN PAYROLL MODAL ═══ */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Run Monthly Payroll
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will compute gross salary, statutory deductions (PF, Tax), and net pay for active employees and generate payslips.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  <Calendar className="h-3.5 w-3.5 inline mr-1 text-primary" /> Period Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary [color-scheme:light_dark]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  <Calendar className="h-3.5 w-3.5 inline mr-1 text-primary" /> Period End Date *
                </label>
                <input
                  type="date"
                  required
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full rounded-xl border border-border bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary [color-scheme:light_dark]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRunModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRunPayroll}
                disabled={processing}
                className="bg-primary text-white font-bold text-xs gap-1.5"
              >
                {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
                {processing ? "Processing 14 Employees..." : "Execute Payroll"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD COMPONENT MODAL ═══ */}
      {showComponentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" /> Add Salary Component
            </h3>
            <p className="text-xs text-slate-500">
              Configure a salary component (earning or deduction) for use in payroll processing.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Component Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Travel Allowance"
                  value={newComponent.name}
                  onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. TA"
                    value={newComponent.code}
                    onChange={(e) => setNewComponent({ ...newComponent, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Type *</label>
                  <select
                    value={newComponent.type}
                    onChange={(e) => setNewComponent({ ...newComponent, type: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="earning">Earning</option>
                    <option value="deduction">Deduction</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Calculation Method</label>
                <select
                  value={newComponent.calculationType}
                  onChange={(e) => setNewComponent({ ...newComponent, calculationType: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage_of_basic">Percentage of Basic Salary</option>
                  <option value="attendance_based">Attendance / Days Based</option>
                </select>
              </div>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newComponent.isTaxable}
                    onChange={(e) => setNewComponent({ ...newComponent, isTaxable: e.target.checked })}
                    className="rounded"
                  />
                  <span>Taxable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newComponent.isStatutory}
                    onChange={(e) => setNewComponent({ ...newComponent, isStatutory: e.target.checked })}
                    className="rounded"
                  />
                  <span>Statutory Deduction</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2 text-xs"
                onClick={() => setShowComponentModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="w-1/2 bg-primary text-white text-xs font-bold"
                onClick={handleCreateComponent}
              >
                Save Component
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD PAY GROUP MODAL ═══ */}
      {showPayGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Create Pay Group
            </h3>
            <p className="text-xs text-slate-500">
              Group employees into distinct payroll cycles and payment dates.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Group Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Monthly Employees"
                  value={newPayGroup.name}
                  onChange={(e) => setNewPayGroup({ ...newPayGroup, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Full-time engineering & corporate staff"
                  value={newPayGroup.description}
                  onChange={(e) => setNewPayGroup({ ...newPayGroup, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Frequency</label>
                  <select
                    value={newPayGroup.frequency}
                    onChange={(e) => setNewPayGroup({ ...newPayGroup, frequency: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pay Day (Day of Month)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newPayGroup.payDate}
                    onChange={(e) => setNewPayGroup({ ...newPayGroup, payDate: parseInt(e.target.value) || 28 })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-1/2 text-xs"
                onClick={() => setShowPayGroupModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="w-1/2 bg-primary text-white text-xs font-bold"
                onClick={handleCreatePayGroup}
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ITEMISED RUN DETAILS MODAL ═══ */}
      {selectedRunForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-3xl w-full p-6 space-y-4 text-slate-900 dark:text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> Employee Payroll Breakdown
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Period: {selectedRunForView.periodStart ? new Date(selectedRunForView.periodStart).toLocaleDateString() : ""} → {selectedRunForView.periodEnd ? new Date(selectedRunForView.periodEnd).toLocaleDateString() : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedRunForView(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingTransactions ? (
                <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading employee itemization...
                </div>
              ) : runTransactions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No individual employee records found for this run.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {runTransactions.map((t, idx) => (
                    <div
                      key={t.id || t._id || idx}
                      className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-slate-50 dark:bg-black/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {t.userName || "Employee"}
                          </span>
                          {t.employeeCode && (
                            <span className="text-primary font-mono text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-bold">
                              {t.employeeCode}
                            </span>
                          )}
                          <span className="text-slate-400 text-[11px]">· {t.designation || "Staff"}</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">{t.userEmail}</span>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Gross / Deduct</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            ₹{(t.grossPay || 0).toLocaleString()} / -₹{(t.totalDeductions || 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Net Salary</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{(t.netPay || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-slate-500">
                Total Employees: <strong>{runTransactions.length}</strong>
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(selectedRunForView)}
                  className="text-xs gap-1 font-bold border-primary/30 text-primary"
                >
                  <Download className="h-3.5 w-3.5" /> Export This Run CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRunForView(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
