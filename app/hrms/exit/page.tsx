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
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserX,
  Pencil,
  Trash2,
  Calendar,
  Filter,
} from "lucide-react";
import { useExits, useExitDashboard } from "@/hooks/hrm/use-exit";
import { useMutation } from "@/hooks/use-mutation";
import { EXIT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  initiated: "info",
  approval_pending: "warning",
  notice_period: "warning",
  clearance_pending: "danger",
  completed: "success",
  cancelled: "info",
};

const exitTypeColors: Record<string, "warning" | "danger" | "info" | "primary"> = {
  resignation: "warning",
  termination: "danger",
  retirement: "info",
  mutual_separation: "primary",
};

const emptyForm = { userId: "", reason: "", exitType: "resignation", resignationDate: "", lastWorkingDate: "", status: "initiated" };

export default function ExitPage() {
  const { data: exits, loading, error, refetch } = useExits();
  const { data: dashboard } = useExitDashboard();
  const mutation = useMutation();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExit, setSelectedExit] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/exit", {
      action: "initiate",
      userId: form.userId,
      reason: form.reason,
      exitType: form.exitType,
      resignationDate: form.resignationDate,
      lastWorkingDate: form.lastWorkingDate,
    });
    if (result) { setShowAddDialog(false); resetForm(); refetch(); }
  };

  const handleEdit = async () => {
    if (!selectedExit) return;
    const result = await mutation.updateRecord(
      `/api/hrm/v2/exit?id=${selectedExit.id}`,
      { action: "status", status: form.status || selectedExit.status }
    );
    if (result) { setShowEditDialog(false); setSelectedExit(null); resetForm(); refetch(); }
  };

  const handleDelete = async () => {
    if (!selectedExit) return;
    const result = await mutation.updateRecord(
      `/api/hrm/v2/exit?id=${selectedExit.id}`,
      { action: "status", status: "cancelled" }
    );
    if (result) { setShowDeleteDialog(false); setSelectedExit(null); refetch(); }
  };

  const openEdit = (exit: any) => {
    setSelectedExit(exit);
    setForm({
      userId: exit.userId || "",
      reason: exit.reason || "",
      exitType: exit.exitType || "resignation",
      resignationDate: exit.resignationDate ? new Date(exit.resignationDate).toISOString().split("T")[0] : "",
      lastWorkingDate: exit.lastWorkingDate ? new Date(exit.lastWorkingDate).toISOString().split("T")[0] : "",
      status: exit.status || "initiated",
    });
    setShowEditDialog(true);
  };

  const openDelete = (exit: any) => {
    setSelectedExit(exit);
    setShowDeleteDialog(true);
  };

  const safeDashboard = dashboard || { totalExits: 0, pendingClearance: 0, noticePeriodActive: 0, completedThisMonth: 0 };

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "userId",
        header: "Employee",
        sortable: true,
        cell: (exit: any) => (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-danger flex items-center justify-center text-white text-xs font-bold">
              {exit.userId?.charAt(0) || "?"}
            </div>
            <span className="text-sm font-medium text-dark dark:text-white">{exit.userId || "—"}</span>
          </div>
        ),
      },
      {
        key: "exitType",
        header: "Exit Type",
        sortable: true,
        cell: (exit: any) => (
          <Badge variant={exitTypeColors[exit.exitType as keyof typeof exitTypeColors] || "info"} size="sm" className="capitalize">
            {exit.exitType?.replace("_", " ") || "—"}
          </Badge>
        ),
      },
      {
        key: "resignationDate",
        header: "Resignation Date",
        sortable: true,
        cell: (exit: any) => <span className="text-sm text-muted">{exit.resignationDate ? formatDate(exit.resignationDate as any) : "—"}</span>,
        hideOnMobile: true,
      },
      {
        key: "lastWorkingDate",
        header: "Last Day",
        sortable: true,
        cell: (exit: any) => <span className="text-sm text-muted">{exit.lastWorkingDate ? formatDate(exit.lastWorkingDate as any) : "—"}</span>,
        hideOnMobile: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (exit: any) => (
          <Badge variant={statusColors[exit.status as keyof typeof statusColors] || "info"} size="sm" className="capitalize">
            {exit.status?.replace("_", " ") || "—"}
          </Badge>
        ),
      },
      {
        key: "clearance",
        header: "Clearance",
        cell: (exit: any) => {
          const clearedCount = exit.clearanceItems?.filter((c: any) => c.status === "cleared").length || 0;
          const totalItems = exit.clearanceItems?.length || 0;
          return <span className="text-sm text-muted">{totalItems > 0 ? `${clearedCount}/${totalItems}` : "—"}</span>;
        },
        hideOnTablet: true,
      },
    ],
    []
  );

  const actions: Action<any>[] = useMemo(
    () => [
      {
        label: "Update Status",
        icon: Pencil,
        onClick: (exit: any) => openEdit(exit),
        variant: "ghost",
      },
      {
        label: "Cancel Exit",
        icon: Trash2,
        onClick: (exit: any) => openDelete(exit),
        variant: "ghost",
      },
    ],
    []
  );

  return (
    <AppShell title="Exit Management">
      <PageHeader
        title="Exit Management"
        description="Manage employee exits — resignations, terminations, and full & final settlements."
      >
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <LogOut className="mr-2 h-4 w-4" />
          Record Exit
        </Button>
      </PageHeader>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Notices", value: safeDashboard.noticePeriodActive, icon: Clock, color: "text-warning" },
          { label: "Clearance Pending", value: safeDashboard.pendingClearance, icon: AlertTriangle, color: "text-danger" },
          { label: "Completed", value: safeDashboard.completedThisMonth, icon: CheckCircle2, color: "text-success" },
          { label: "Total Exits", value: safeDashboard.totalExits, icon: UserX, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={exits || []}
        actions={actions}
        searchable
        searchPlaceholder="Search by employee or reason..."
        searchKeys={["userId", "reason", "exitType"]}
        defaultPageSize={10}
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No exit records found yet"
        showEntriesSelector
        showRecordCount
        skeletonRows={5}
        ariaLabel="Exit records table"
      />

      {/* Record Exit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <LogOut className="h-4 w-4 text-danger" />
              </div>
              Record Exit
            </DialogTitle>
            <DialogDescription>Initiate an employee exit process.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-6">
            <FormSection title="Employee & Exit Details" icon={<UserX className="h-4 w-4" />} columns={2}>
              <FormInput
                label="Employee ID"
                icon={<UserX className="h-4 w-4" />}
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
                placeholder="user_123"
              />
              <FormSelect
                label="Exit Type"
                icon={<Filter className="h-4 w-4" />}
                value={form.exitType}
                onChange={(e) => setForm({ ...form, exitType: e.target.value })}
                options={EXIT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
              <FormInput
                label="Resignation Date"
                type="date"
                icon={<Calendar className="h-4 w-4" />}
                value={form.resignationDate}
                onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
                required
              />
              <FormInput
                label="Last Working Day"
                type="date"
                icon={<Calendar className="h-4 w-4" />}
                value={form.lastWorkingDate}
                onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })}
                required
              />
            </FormSection>
            <FormSection title="Reason" icon={<AlertTriangle className="h-4 w-4" />}>
              <FormTextarea
                label="Reason for Exit"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Reason for the employee's exit..."
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => setShowAddDialog(false)}
              submitLabel="Initiate Exit"
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-4 w-4 text-primary" />
              </div>
              Update Exit Status
            </DialogTitle>
            <DialogDescription>Modify the exit status or details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }} className="space-y-6">
            <FormSection title="Status Update" icon={<Filter className="h-4 w-4" />}>
              <FormSelect
                label="Exit Status"
                icon={<Clock className="h-4 w-4" />}
                value={form.status || selectedExit?.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={Object.keys(statusColors).map((s) => ({
                  value: s,
                  label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                }))}
              />
              <FormTextarea
                label="Reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Update reason..."
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => setShowEditDialog(false)}
              submitLabel="Save Changes"
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Exit Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Cancel Exit
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this exit process for <strong>{selectedExit?.userId || "this employee"}</strong>?
            </DialogDescription>
          </DialogHeader>
          {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={mutation.loading}>No, Keep</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />Yes, Cancel Exit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
