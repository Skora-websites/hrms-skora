"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column, Action } from "@/components/shared/data-table";
import { FormActions } from "@/components/ui/form-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Mail,
  Check,
  Trash2,
  Pencil,
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

import { useServerTable } from "@/hooks/use-server-table";
import { useDepartments, useDesignations } from "@/hooks/hrm/use-organization";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import EmployeeFormFields from "@/components/employees/employee-form-fields";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ───────────────────────────────────────────

const statusColors: Record<string, "success" | "warning" | "danger" | "info"> = {
  active: "success",
  probation: "warning",
  notice_period: "warning",
  terminated: "danger",
  resigned: "danger",
  inactive: "danger",
  disabled: "danger",
};

const EMPLOYEE_STATUSES = [
  { value: "", label: "All Statuses" },
  ...["active", "probation", "notice_period", "terminated", "resigned"].map((s) => ({
    value: s,
    label: s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
];



interface FormState {
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  status: string;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  joiningDate: string;
  employeeCode: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
}

const emptyForm: FormState = {
  displayName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "employee",
  status: "active",
  departmentId: "",
  departmentName: "",
  designationId: "",
  designationName: "",
  joiningDate: "",
  employeeCode: "",
  address: "",
  emergencyContact: "",
  emergencyPhone: "",
};

// ── Validation (returns errors dict — empty = valid) ────

function validateForm(form: FormState, isEdit: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Invalid email format";
  }
  if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) {
    errors.phone = "Enter a valid phone number";
  }
  if (!isEdit && !form.password.trim()) {
    errors.password = "Password is required";
  } else if (!isEdit && form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
}

function validateField(field: keyof FormState, value: string, form: FormState, isEdit: boolean): string {
  switch (field) {
    case "firstName":
      return value.trim() ? "" : "First name is required";
    case "lastName":
      return value.trim() ? "" : "Last name is required";
    case "email":
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
      return "";
    case "phone":
      return !value || /^[\d\s\-+()]{7,20}$/.test(value) ? "" : "Enter a valid phone number";
    case "password":
      if (isEdit) return "";
      if (!value.trim()) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
      return "";
    default:
      return "";
  }
}

// ── Columns ────────────────────────────────────────────

function useEmployeeColumns(
  openEdit: (emp: any) => void,
  openDelete: (emp: any) => void
): Column<any>[] {
  return useMemo(
    () => [
      {
        key: "name",
        header: "Employee",
        sortable: true,
        sortKey: "displayName",
        cell: (emp: any) => {
          const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.displayName || "—";
          return (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dark dark:text-white truncate">{fullName}</p>
                <p className="text-xs text-muted truncate flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  {emp.email || "—"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: "employeeCode",
        header: "Code",
        sortable: true,
        cell: (emp: any) => (
          <span className="text-xs font-mono font-medium text-muted bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {emp.employeeCode || "—"}
          </span>
        ),
        hideOnMobile: true,
      },
      {
        key: "departmentName",
        header: "Department",
        sortable: true,
        cell: (emp: any) => <span className="text-sm text-muted">{emp.departmentName || "—"}</span>,
        hideOnMobile: true,
      },
      {
        key: "designationName",
        header: "Designation",
        sortable: true,
        cell: (emp: any) => <span className="text-sm text-muted">{emp.designationName || "—"}</span>,
        hideOnTablet: true,
      },
      {
        key: "role",
        header: "Role",
        sortable: true,
        cell: (emp: any) => (
          <span className="text-sm capitalize text-dark dark:text-white font-medium">
            {emp.role?.replace("_", " ") || "—"}
          </span>
        ),
        hideOnTablet: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (emp: any) => (
          <Badge variant={statusColors[emp.status as keyof typeof statusColors] || "info"} size="sm">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white opacity-90" />
              {emp.status?.replace("_", " ") || "—"}
            </span>
          </Badge>
        ),
      },
    ],
    [openEdit, openDelete]
  );
}

// ── Component ───────────────────────────────────────────

export default function EmployeesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const mutation = useMutation();
  const toast = useToast();

  // ── Server-side table state ──────────────────────────
  const { dataTableProps, queryString } = useServerTable({
    defaultSortKey: "displayName",
    debounceMs: 300,
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build URL with status filter
  const apiUrl = useMemo(() => {
    const qs = statusFilter
      ? `${queryString}&status=${encodeURIComponent(statusFilter)}`
      : queryString;
    return `/api/hrm/v2/employees?${qs}`;
  }, [queryString, statusFilter]);

  // Fetch data when URL changes
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Failed to load employees");
      const json = await res.json();
      setEmployees(json.data || []);
      setTotalItems(json.totalItems || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Auto-refresh every 30 seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    intervalRef.current = setInterval(fetchEmployees, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEmployees]);

  // Derived counts from current page data
  const activeCount = useMemo(
    () => employees.filter((e: any) => e.status === "active").length,
    [employees]
  );
  const probationCount = useMemo(
    () => employees.filter((e: any) => e.status === "probation").length,
    [employees]
  );

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);

  // Refs for auto-focus
  const addDialogFirstFieldRef = useRef<HTMLInputElement>(null);
  const editDialogFirstFieldRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setFormErrors({});
    setFieldTouched({});
    setDeleteConfirmName("");
    setEmergencyExpanded(false);
  }, []);

  // ── Auto-generate displayName ──────────────────────────
  const updateNameField = useCallback(
    (field: "firstName" | "lastName", value: string) => {
      const updated = { ...form, [field]: value };
      const first = field === "firstName" ? value : updated.lastName;
      const last = field === "lastName" ? value : updated.firstName;
      const fullName = `${first} ${last}`.trim();
      if (fullName) {
        updated.displayName = fullName;
      }
      setForm(updated);
    },
    [form]
  );

  // ── Inline validation on blur ──────────────────────────
  const handleBlur = useCallback(
    (field: keyof FormState) => {
      setFieldTouched((prev) => ({ ...prev, [field]: true }));
      const isEdit = showEditDialog;
      const error = validateField(field, form[field], form, isEdit);
      setFormErrors((prev) => {
        if (error) return { ...prev, [field]: error };
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    },
    [form, showEditDialog]
  );

  // ── Handlers ──────────────────────────────────────────

  const handleAdd = async () => {
    const errors = validateForm(form, false);
    setFormErrors(errors);
    setFieldTouched({ firstName: true, lastName: true, email: true, password: true });
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const payload: Record<string, any> = {
      ...form,
      displayName: form.displayName || `${form.firstName} ${form.lastName}`.trim(),
      joiningDate: form.joiningDate || undefined,
    };
    if (!payload.password) delete payload.password;
    const result = await mutation.createRecord("/api/hrm/v2/employees", payload);
    if (result) {
      setShowAddDialog(false);
      resetForm();
      fetchEmployees();
      toast.success("Employee created", `${form.firstName} ${form.lastName} has been added successfully.`);
    } else {
      toast.error("Failed to create employee", mutation.error || "An unexpected error occurred. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleEdit = async () => {
    if (!selectedEmployee) return;

    const errors = validateForm(form, true);
    setFormErrors(errors);
    setFieldTouched({ firstName: true, lastName: true, email: true });
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const payload: Record<string, any> = { ...form };
    delete payload.password;
    payload.joiningDate = form.joiningDate || undefined;
    const result = await mutation.updateRecord(
      `/api/hrm/v2/employees?id=${selectedEmployee.id}`,
      payload
    );
    if (result) {
      setShowEditDialog(false);
      setSelectedEmployee(null);
      resetForm();
      fetchEmployees();
      toast.success("Employee updated", "Changes have been saved successfully.");
    } else {
      toast.error("Failed to update employee", mutation.error || "An unexpected error occurred. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setIsSubmitting(true);
    const result = await mutation.deleteRecord(
      `/api/hrm/v2/employees?id=${selectedEmployee.id}`
    );
    if (result) {
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      fetchEmployees();
      toast.success("Employee deleted", `${selectedEmployee.displayName || "Employee"} has been removed.`);
    } else {
      toast.error("Failed to delete employee", mutation.error || "An unexpected error occurred. Please try again.");
    }
    setIsSubmitting(false);
  };

  const openEdit = (emp: any) => {
    setSelectedEmployee(emp);
    setForm({
      displayName: emp.displayName || "",
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      email: emp.email || "",
      phone: emp.phone || "",
      password: "",
      role: emp.role || "employee",
      status: emp.status || "active",
      departmentId: emp.departmentId || "",
      departmentName: emp.departmentName || "",
      designationId: emp.designationId || "",
      designationName: emp.designationName || "",
      joiningDate: emp.joiningDate
        ? typeof emp.joiningDate === "string"
          ? emp.joiningDate.split("T")[0]
          : emp.joiningDate instanceof Date
            ? emp.joiningDate.toISOString().split("T")[0]
            : ""
        : "",
      employeeCode: emp.employeeCode || "",
      address: emp.address || "",
      emergencyContact: emp.emergencyContact || "",
      emergencyPhone: emp.emergencyPhone || "",
    });
    setFormErrors({});
    setFieldTouched({});
    setEmergencyExpanded(!!emp.emergencyContact || !!emp.emergencyPhone);
    setShowEditDialog(true);
    setTimeout(() => editDialogFirstFieldRef.current?.focus(), 100);
  };

  const openDelete = (emp: any) => {
    setSelectedEmployee(emp);
    setDeleteConfirmName("");
    setShowDeleteDialog(true);
  };

  const openAddDialog = useCallback(() => {
    resetForm();
    setShowAddDialog(true);
    setTimeout(() => addDialogFirstFieldRef.current?.focus(), 100);
  }, [resetForm]);

  // ── Columns ───────────────────────────────────────────

  const columns = useEmployeeColumns(openEdit, openDelete);

  // ── Actions ───────────────────────────────────────────

  const actions: Action<any>[] = useMemo(
    () => [
      {
        label: "Edit",
        icon: Pencil,
        onClick: (emp: any) => openEdit(emp),
        variant: "ghost",
      },
      {
        label: "Delete",
        icon: Trash2,
        onClick: (emp: any) => openDelete(emp),
        variant: "ghost",
      },
    ],
    []
  );

  // ── Filter (status) ──────────────────────────────────

  const statusFilterEl = (
    <div className="relative">
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value); }}
        className="h-9 rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:shadow-[0_3px_9px_rgba(94,114,228,0.1)] focus:outline-none"
        aria-label="Filter by status"
      >
        {EMPLOYEE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
    </div>
  );

  // ── Loading Skeleton for summary cards ─────────────────

  const summaryLoading = loading && employees.length === 0;

  return (
    <AppShell title="Employees">
      {/* Toasts */}
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toast
                variant={t.variant}
                message={t.message}
                description={t.description}
                onClose={() => toast.dismissToast(t.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="Employees"
        description="Manage your workforce — view, add, and manage employee records."
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={async () => {
            setIsRefreshing(true);
            await fetchEmployees();
            setIsRefreshing(false);
          }} title={isRefreshing ? "Refreshing..." : "Refresh data"} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button onClick={openAddDialog}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Total Employees</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  {employees?.length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold text-success mt-1">{activeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">On Probation</p>
                <p className="text-2xl font-bold text-warning mt-1">{probationCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-warning" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={employees || []}
        actions={actions}
        searchable
        searchPlaceholder="Search by name, email, code, department..."
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={fetchEmployees}
        emptyMessage={loading ? "" : "No employees found yet"}
        filters={statusFilterEl}
        skeletonRows={5}
        ariaLabel="Employees table"
        totalItems={totalItems}
        {...dataTableProps}
      />

      {/* ── Add Dialog ── */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) { setShowAddDialog(false); resetForm(); }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Add Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee record. Fields marked with * are required.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
            <div className="space-y-4 px-0.5">
              <EmployeeFormFields
                form={form}
                formErrors={formErrors}
                fieldTouched={fieldTouched}
                departments={departments || []}
                designations={designations || []}
                updateNameField={updateNameField}
                handleBlur={handleBlur}
                setForm={setForm}
                emergencyExpanded={emergencyExpanded}
                setEmergencyExpanded={setEmergencyExpanded}
                addDialogFirstFieldRef={addDialogFirstFieldRef}
                editDialogFirstFieldRef={editDialogFirstFieldRef}
              />
            </div>
            <FormActions
              onCancel={() => { setShowAddDialog(false); resetForm(); }}
              submitLabel={isSubmitting ? "Creating..." : "Create Employee"}
              submitIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              loading={isSubmitting}
              error={mutation.error}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) { setShowEditDialog(false); setSelectedEmployee(null); resetForm(); }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-lg shadow-primary/20">
                <Pencil className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Edit Employee</DialogTitle>
                <DialogDescription>
                  Update details for <strong>{selectedEmployee?.displayName || "this employee"}</strong>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="space-y-4 px-0.5">
              <EmployeeFormFields
                form={form}
                formErrors={formErrors}
                fieldTouched={fieldTouched}
                departments={departments || []}
                designations={designations || []}
                updateNameField={updateNameField}
                handleBlur={handleBlur}
                setForm={setForm}
                emergencyExpanded={emergencyExpanded}
                setEmergencyExpanded={setEmergencyExpanded}
                isEdit
                addDialogFirstFieldRef={addDialogFirstFieldRef}
                editDialogFirstFieldRef={editDialogFirstFieldRef}
              />
            </div>
            <FormActions
              onCancel={() => { setShowEditDialog(false); setSelectedEmployee(null); resetForm(); }}
              submitLabel={isSubmitting ? "Saving..." : "Save Changes"}
              submitIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              loading={isSubmitting}
              error={mutation.error}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) { setShowDeleteDialog(false); setSelectedEmployee(null); resetForm(); }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-danger text-white shadow-lg shadow-danger/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Delete Employee</DialogTitle>
                <DialogDescription>
                  This will permanently remove <strong>{selectedEmployee?.displayName || "this employee"}</strong>&apos;s account and all associated data. This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 flex items-start gap-2 mt-2">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-danger">
              All employee records, attendance data, and assigned assets will be permanently removed.
            </p>
          </div>

          {/* Confirmation input */}
          <div className="mt-4">
            <label className="block text-sm font-semibold text-dark dark:text-white mb-1.5">
              Type <strong>{selectedEmployee?.displayName || "the employee name"}</strong> to confirm
            </label>
            <div className="relative">
              <Input
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Type the employee name..."
                className="border-danger/40 focus:border-danger focus:shadow-[0_3px_9px_rgba(245,54,92,0.15)]"
              />
            </div>
          </div>

          <FormActions
            onCancel={() => { setShowDeleteDialog(false); setSelectedEmployee(null); resetForm(); }}
            submitLabel={isSubmitting ? "Deleting..." : "Delete Forever"}
            submitIcon={isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            submitVariant="danger"
            loading={isSubmitting}
            disabled={deleteConfirmName.trim() !== (selectedEmployee?.displayName || `${selectedEmployee?.firstName || ""} ${selectedEmployee?.lastName || ""}`.trim()) || isSubmitting}
            error={mutation.error}
            sticky={false}
          />
          {deleteConfirmName && deleteConfirmName.trim() !== (selectedEmployee?.displayName || `${selectedEmployee?.firstName || ""} ${selectedEmployee?.lastName || ""}`.trim()) && (
            <p className="text-xs text-danger mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Name does not match. Delete button is disabled until the full name is typed.
            </p>
          )}
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
