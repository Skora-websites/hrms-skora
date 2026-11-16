"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import type { Column, Action } from "@/components/shared/data-table";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSection } from "@/components/ui/form-section";
import { FormActions } from "@/components/ui/form-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Barcode,
  Wrench,
  Calendar,
  DollarSign,
  ClipboardList,
  UserCheck,
  RotateCcw,
  Users,
} from "lucide-react";
import { useAssets } from "@/hooks/hrm/use-assets";
import { useMutation } from "@/hooks/use-mutation";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { AnimatePresence } from "framer-motion";
import { ASSET_CONDITIONS, ASSET_STATUS_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const conditionColors: Record<string, "success" | "danger" | "info" | "warning"> = {
  new: "success",
  good: "info",
  fair: "warning",
  damaged: "danger",
  disposed: "danger",
};

const statusColors: Record<string, "success" | "warning" | "danger" | "primary" | "info"> = {
  available: "success",
  assigned: "primary",
  under_maintenance: "warning",
  disposed: "danger",
};

const emptyForm = {
  name: "",
  assetCode: "",
  serialNumber: "",
  categoryId: "",
  condition: "new",
  status: "available",
  purchaseDate: "",
  purchasePrice: "",
  notes: "",
};

interface UserOption {
  id: string;
  displayName?: string;
  email?: string;
}

export default function AssetsPage() {
  const { data: assets, loading, error, refetch } = useAssets();
  const mutation = useMutation();
  const toast = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  // Assign & Return state
  const [assignUserId, setAssignUserId] = useState("");
  const [assignCondition, setAssignCondition] = useState("good");
  const [returnCondition, setReturnCondition] = useState("good");
  const [returnNotes, setReturnNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // User list for assignments
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/hrm/v2/users?action=list")
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data) => {
        const users = (data.data || []) as UserOption[];
        setUserOptions(users);
        setUserNames(
          Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id]))
        );
      })
      .catch(() => {});
  }, []);

  const resetForm = useCallback(() => setForm(emptyForm), []);

  const handleAdd = async () => {
    const result = await mutation.createRecord("/api/hrm/v2/assets", {
      ...form,
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
    });
    if (result) {
      setShowAddDialog(false);
      resetForm();
      refetch();
      toast.success("Asset registered", "New asset added to inventory.");
    }
  };

  const handleEdit = async () => {
    if (!selectedAsset) return;
    const result = await mutation.updateRecord(`/api/hrm/v2/assets?id=${selectedAsset.id}`, form);
    if (result) {
      setShowEditDialog(false);
      setSelectedAsset(null);
      resetForm();
      refetch();
      toast.success("Asset updated", "Asset details updated successfully.");
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    const result = await mutation.deleteRecord(`/api/hrm/v2/assets?id=${selectedAsset.id}`);
    if (result) {
      setShowDeleteDialog(false);
      setSelectedAsset(null);
      refetch();
      toast.success("Asset removed", "Asset has been deleted.");
    }
  };

  const handleAssign = async () => {
    if (!selectedAsset || !assignUserId) {
      toast.error("Validation error", "Please select an employee to assign this asset.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          assetId: selectedAsset.id,
          userId: assignUserId,
          condition: assignCondition,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign asset");
      }

      toast.success("Asset assigned", `Asset assigned to ${userNames[assignUserId] || assignUserId}.`);
      setShowAssignDialog(false);
      setSelectedAsset(null);
      setAssignUserId("");
      refetch();
    } catch (e: any) {
      toast.error("Assign error", e.message || "Could not assign asset");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedAsset) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "return",
          assetId: selectedAsset.id,
          condition: returnCondition,
          notes: returnNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process asset return");
      }

      toast.success("Asset returned", "Asset marked available and checked back into inventory.");
      setShowReturnDialog(false);
      setSelectedAsset(null);
      setReturnNotes("");
      refetch();
    } catch (e: any) {
      toast.error("Return error", e.message || "Could not process return");
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (asset: any) => {
    setSelectedAsset(asset);
    setForm({
      name: asset.name || "",
      assetCode: asset.assetCode || "",
      serialNumber: asset.serialNumber || "",
      categoryId: asset.categoryId || "",
      condition: asset.condition || "new",
      status: asset.status || "available",
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split("T")[0] : "",
      purchasePrice: asset.purchasePrice?.toString() || "",
      notes: asset.notes || "",
    });
    setShowEditDialog(true);
  };

  const openDelete = (asset: any) => {
    setSelectedAsset(asset);
    setShowDeleteDialog(true);
  };

  const openAssign = (asset: any) => {
    setSelectedAsset(asset);
    setAssignUserId("");
    setAssignCondition(asset.condition || "good");
    setShowAssignDialog(true);
  };

  const openReturn = (asset: any) => {
    setSelectedAsset(asset);
    setReturnCondition(asset.condition || "good");
    setReturnNotes("");
    setShowReturnDialog(true);
  };

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Asset",
        sortable: true,
        cell: (asset: any) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-dark dark:text-white">{asset.name}</p>
              {asset.assetCode && <p className="text-xs font-mono text-muted">{asset.assetCode}</p>}
            </div>
          </div>
        ),
      },
      {
        key: "serialNumber",
        header: "Serial #",
        cell: (asset: any) => <span className="text-sm font-mono text-muted">{asset.serialNumber || "—"}</span>,
        hideOnTablet: true,
      },
      {
        key: "categoryId",
        header: "Category",
        sortable: true,
        cell: (asset: any) => <span className="text-sm text-muted">{asset.categoryId || "—"}</span>,
        hideOnMobile: true,
      },
      {
        key: "assignedTo",
        header: "Assigned To",
        cell: (asset: any) => {
          const uid = asset.assignedToUserId || asset.assignedTo;
          if (!uid) return <span className="text-xs text-muted">—</span>;
          return (
            <span className="text-xs font-medium text-dark dark:text-white flex items-center gap-1">
              <Users className="h-3 w-3 text-muted" />
              {userNames[uid] || uid}
            </span>
          );
        },
      },
      {
        key: "condition",
        header: "Condition",
        sortable: true,
        cell: (asset: any) => (
          <Badge variant={conditionColors[asset.condition as keyof typeof conditionColors] || "info"} size="sm">
            {ASSET_CONDITIONS.find((c) => c.value === asset.condition)?.label || asset.condition || "—"}
          </Badge>
        ),
        hideOnTablet: true,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        cell: (asset: any) => (
          <Badge variant={statusColors[asset.status as keyof typeof statusColors] || "info"} size="sm">
            {ASSET_STATUS_OPTIONS.find((s) => s.value === asset.status)?.label || asset.status || "—"}
          </Badge>
        ),
      },
      {
        key: "purchaseDate",
        header: "Purchase Date",
        sortable: true,
        cell: (asset: any) => (
          <span className="text-sm text-muted">{asset.purchaseDate ? formatDate(asset.purchaseDate as any) : "—"}</span>
        ),
        hideOnMobile: true,
      },
    ],
    [userNames]
  );

  const actions: Action<any>[] = useMemo(
    () => [
      {
        label: "Assign",
        icon: UserCheck,
        onClick: (asset: any) => openAssign(asset),
        variant: "ghost",
      },
      {
        label: "Return",
        icon: RotateCcw,
        onClick: (asset: any) => openReturn(asset),
        variant: "ghost",
      },
      {
        label: "Edit",
        icon: Pencil,
        onClick: (asset: any) => openEdit(asset),
        variant: "ghost",
      },
      {
        label: "Delete",
        icon: Trash2,
        onClick: (asset: any) => openDelete(asset),
        variant: "ghost",
      },
    ],
    []
  );

  const FormFields = ({ isEdit }: { isEdit?: boolean }) => (
    <>
      <FormSection title="Asset Information" description={isEdit ? "Update asset details" : "Register a new company asset"} icon={<Package className="h-4 w-4" />} columns={2} gradient>
        <FormInput label="Asset Name" icon={<Tag className="h-4 w-4" />} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MacBook Pro 16" required />
        <FormInput label="Asset Code" icon={<Barcode className="h-4 w-4" />} value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value })} placeholder="AST-001" />
        <FormInput label="Serial Number" icon={<Barcode className="h-4 w-4" />} value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="SN-12345" />
        <FormInput label="Category ID" icon={<ClipboardList className="h-4 w-4" />} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} placeholder="laptops" helperText="e.g., laptops, monitors, accessories" />
      </FormSection>
      <FormSection title="Condition & Status" description="Current state and availability" icon={<Wrench className="h-4 w-4" />} columns={2}>
        <FormSelect label="Condition" icon={<Wrench className="h-4 w-4" />} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} options={ASSET_CONDITIONS.map((c) => ({ value: c.value, label: c.label }))} />
        <FormSelect label="Status" icon={<Package className="h-4 w-4" />} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={ASSET_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))} />
      </FormSection>
      {!isEdit && (
        <FormSection title="Purchase Details" description="Acquisition information" icon={<DollarSign className="h-4 w-4" />} columns={2}>
          <FormInput label="Purchase Date" type="date" icon={<Calendar className="h-4 w-4" />} value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          <FormInput label="Purchase Price" type="number" icon={<DollarSign className="h-4 w-4" />} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} min="0" step="0.01" placeholder="2499.00" helperText="Enter the purchase amount" />
        </FormSection>
      )}
      <FormSection title="Additional Notes" columns={1}>
        <FormTextarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes about this asset..." />
      </FormSection>
    </>
  );

  return (
    <AppShell title="Assets">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              description={t.description}
              onClose={() => toast.dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader title="Assets & Equipment" description="Track and manage company equipment, employee allocations, and returns.">
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={assets || []}
        actions={actions}
        searchable
        searchPlaceholder="Search by name, code, or serial number..."
        searchKeys={["name", "assetCode", "serialNumber", "categoryId"]}
        defaultPageSize={10}
        striped
        stickyHeader
        loading={loading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="No assets found in inventory"
        showEntriesSelector
        showRecordCount
        skeletonRows={5}
        ariaLabel="Assets table"
      />

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Add Asset</DialogTitle>
                <DialogDescription>Register a new company asset into inventory.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormFields />
            </div>
            <FormActions onCancel={() => setShowAddDialog(false)} submitLabel="Create Asset" submitIcon={<Plus className="h-4 w-4" />} loading={mutation.loading} error={mutation.error} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Asset</DialogTitle>
                <DialogDescription>Update asset inventory details.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleEdit(); }}>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto px-0.5">
              <FormFields isEdit />
            </div>
            <FormActions onCancel={() => setShowEditDialog(false)} submitLabel="Save Changes" submitIcon={<Pencil className="h-4 w-4" />} loading={mutation.loading} error={mutation.error} />
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Assign Asset</DialogTitle>
                <DialogDescription>Allocate {selectedAsset?.name} to an employee.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAssign(); }}>
            <div className="space-y-4">
              <FormSelect
                label="Assign to Employee"
                options={[
                  { value: "", label: "Select employee" },
                  ...userOptions.map((u) => ({ value: u.id, label: u.displayName || u.email || u.id })),
                ]}
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                required
              />
              <FormSelect
                label="Condition at Assignment"
                options={[
                  { value: "new", label: "New" },
                  { value: "good", label: "Good" },
                  { value: "fair", label: "Fair" },
                ]}
                value={assignCondition}
                onChange={(e) => setAssignCondition(e.target.value)}
              />
              <FormActions
                onCancel={() => setShowAssignDialog(false)}
                submitLabel="Assign Asset"
                loading={actionLoading}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Process Asset Return</DialogTitle>
                <DialogDescription>Check in {selectedAsset?.name} back into inventory.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleReturn(); }}>
            <div className="space-y-4">
              <FormSelect
                label="Condition at Return"
                options={[
                  { value: "good", label: "Good" },
                  { value: "fair", label: "Fair" },
                  { value: "damaged", label: "Damaged" },
                  { value: "needs_maintenance", label: "Needs Maintenance" },
                ]}
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
              />
              <FormTextarea
                label="Return Notes / Inspection Summary"
                placeholder="Include charger, cable condition, physical scratches, etc..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
              <FormActions
                onCancel={() => setShowReturnDialog(false)}
                submitLabel="Complete Return"
                loading={actionLoading}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-danger text-white">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Delete Asset</DialogTitle>
                <DialogDescription>Are you sure you want to delete {selectedAsset?.name || "this asset"}? This cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <FormActions onCancel={() => setShowDeleteDialog(false)} submitLabel="Delete" submitIcon={<Trash2 className="h-4 w-4" />} submitVariant="danger" loading={mutation.loading} error={mutation.error} sticky={false} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
