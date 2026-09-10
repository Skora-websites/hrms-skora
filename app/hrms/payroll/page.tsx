"use client";

import { useState, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column, Action } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormSection } from "@/components/ui/form-section";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import {
  DollarSign,
  TrendingUp,
  Users,
  Banknote,
  Receipt,
  Pencil,
  Trash2,
  Download,
} from "lucide-react";
import { usePayrollRuns } from "@/hooks/hrm/use-payroll";
import { useMutation } from "@/hooks/use-mutation";
import { formatCurrency, formatDate } from "@/lib/utils";

const PAYROLL_STATUSES = ["draft", "processing", "completed", "cancelled"];

const emptyForm = { payGroupId: "", periodStart: "", periodEnd: "", notes: "" };

export default function PayrollPage() {
  const { data: payrolls, loading, error, refetch } = usePayrollRuns();
  const mutation = useMutation();

  const [showRunDialog, setShowRunDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [editStatus, setEditStatus] = useState("draft");

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleRun = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/payroll/runs", form);
    if (result) {
      setShowRunDialog(false);
      resetForm();
      refetch();
    }
  };

  const handleEdit = async () => {
    if (!selectedPayroll) return;
    const result = await mutation.updateRecord(
      `/api/hrm/v2/payroll/runs?id=${selectedPayroll.id}`,
      { status: editStatus }
    );
    if (result) {
      setShowEditDialog(false);
      setSelectedPayroll(null);
      refetch();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await mutation.deleteRecord(`/api/hrm/v2/payroll/runs?id=${id}`);
    if (result) refetch();
  };

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "periodStart",
        header: "Period Start",
        sortable: true,
        cell: (pay: any) => <span className="text-sm text-muted">{pay.periodStart ? formatDate(pay.periodStart as any) : "—"}</span>,
      },
      {
        key: "periodEnd",
        header: "Period End",
        sortable: true,
        cell: (pay: any) => <span className="text-sm text-muted">{pay.periodEnd ? formatDate(pay.periodEnd as any) : "—"}</span>,
        hideOnMobile: true,
      },
      {
        key: "totalEmployees",
        header: "Employees",
        sortable: true,
        cell: (pay: any) => <span className="text-sm font-medium">{pay.totalEmployees || 0}</span>,
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "totalGrossPay",
        header: "Gross",
        sortable: true,
        cell: (pay: any) => <span className="text-sm font-medium">{pay.totalGrossPay ? formatCurrency(pay.totalGrossPay) : "—"}</span>,
        className: "text-right",
        headerClassName: "text-right",
        hideOnMobile: true,
      },
      {
        key: "totalDeductions",
        header: "Deductions",
        sortable: true,
        cell: (pay: any) => <span className="text-sm text-danger">{pay.totalDeductions ? formatCurrency(pay.totalDeductions) : "—"}</span>,
        className: "text-right",
        headerClassName: "text-right",
        hideOnTablet: true,
      },
      {
        key: "totalNetPay",
        header: "Net Pay",
        sortable: true,
        cell: (pay: any) => <span className="text-sm font-semibold text-dark dark:text-white">{pay.totalNetPay ? formatCurrency(pay.totalNetPay) : "—"}</span>,
        className: "text-right",
        headerClassName: "text-right",
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (pay: any) => (
          <Badge variant={pay.status === "completed" ? "success" : pay.status === "processing" ? "warning" : "danger"} size="sm">
            {pay.status || "—"}
          </Badge>
        ),
      },
    ],
    []
  );

  const actions: Action<any>[] = useMemo(
    () => [
      {
        label: "Edit Status",
        icon: Pencil,
        onClick: (pay: any) => {
          setSelectedPayroll(pay);
          setEditStatus(pay.status || "draft");
          setShowEditDialog(true);
        },
        variant: "ghost",
      },
      {
        label: "Delete",
        icon: Trash2,
        onClick: (pay: any) => handleDelete(pay.id),
        variant: "ghost",
      },
    ],
    []
  );

  return (
    <AppShell title="Payroll">
      <PageHeader
        title="Payroll"
        description="Manage salary components, pay groups, and process payroll runs."
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => { resetForm(); setShowRunDialog(true); }}>
            <Receipt className="mr-2 h-4 w-4" />
            Run Payroll
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Payroll", value: "—", icon: DollarSign, color: "text-primary" },
          { label: "Active Employees", value: "—", icon: Users, color: "text-info" },
          { label: "Avg. Salary", value: "—", icon: Banknote, color: "text-success" },
          { label: "YTD Growth", value: "—", icon: TrendingUp, color: "text-warning" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={payrolls || []}
        actions={actions}
        searchable
        searchPlaceholder="Search payroll records..."
        searchKeys={["payGroupId", "status"]}
        defaultPageSize={10}
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No payroll records found yet"
        showEntriesSelector
        showRecordCount
        skeletonRows={5}
        ariaLabel="Payroll records table"
      />

      {/* Run Payroll Dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <Receipt className="h-4 w-4 text-success" />
              </div>
              Run Payroll
            </DialogTitle>
            <DialogDescription>Create a new payroll run for an upcoming pay period.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleRun(); }} className="space-y-6">
            <FormSection title="Payroll Period" icon={<DollarSign className="h-4 w-4" />} columns={2}>
              <FormInput
                label="Pay Group ID"
                icon={<DollarSign className="h-4 w-4" />}
                value={form.payGroupId}
                onChange={(e) => setForm({ ...form, payGroupId: e.target.value })}
                placeholder="pay_group_main"
              />
              <FormInput
                label="Period Start"
                type="date"
                icon={<DollarSign className="h-4 w-4" />}
                value={form.periodStart}
                onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                required
              />
              <FormInput
                label="Period End"
                type="date"
                icon={<DollarSign className="h-4 w-4" />}
                value={form.periodEnd}
                onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                required
              />
            </FormSection>
            <FormSection title="Notes" icon={<DollarSign className="h-4 w-4" />}>
              <FormTextarea
                label="Notes (Optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any notes about this payroll run..."
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => setShowRunDialog(false)}
              submitLabel="Process Payroll"
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              Update Status
            </DialogTitle>
            <DialogDescription>Change the payroll run status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormSelect
              label="Status"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              options={PAYROLL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
          </div>
          {mutation.error && (
            <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} disabled={mutation.loading}>Cancel</Button>
            <Button onClick={handleEdit} loading={mutation.loading}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
