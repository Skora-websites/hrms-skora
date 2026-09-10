"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
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
import { FormSection } from "@/components/ui/form-section";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormActions } from "@/components/ui/form-actions";
import {
  Building2,
  Search,
  Plus,
  Users,
  Briefcase,
  MapPin,
  LayoutGrid,
  Pencil,
  Trash2,
} from "lucide-react";
import { useOrganizations, useDepartments, useDesignations } from "@/hooks/hrm/use-organization";
import { useMutation } from "@/hooks/use-mutation";

const emptyDeptForm = { name: "", code: "", organizationId: "", headUserId: "", status: "active" };
const emptyDesigForm = { name: "", grade: "", level: "1", organizationId: "" };

export default function OrganizationPage() {
  const [search, setSearch] = useState("");
  const { data: departments, loading, error, refetch } = useDepartments();
  const { data: designations, refetch: refetchDesigs } = useDesignations();
  const mutation = useMutation();

  const [showAddDept, setShowAddDept] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [deptForm, setDeptForm] = useState(emptyDeptForm);

  const [showAddDesig, setShowAddDesig] = useState(false);
  const [editDesig, setEditDesig] = useState<any>(null);
  const [desigForm, setDesigForm] = useState(emptyDesigForm);

  const [deleteItem, setDeleteItem] = useState<{ type: "department" | "designation"; id: string; name: string } | null>(null);

  const resetDeptForm = useCallback(() => { setDeptForm(emptyDeptForm); setEditDept(null); }, []);
  const resetDesigForm = useCallback(() => { setDesigForm(emptyDesigForm); setEditDesig(null); }, []);

  const handleSaveDept = async () => {
    if (editDept) {
      const result = await mutation.updateRecord(`/api/hrm/v2/organizations?id=${editDept.id}`, { ...deptForm, type: "department" });
      if (result) { setEditDept(null); setShowAddDept(false); refetch(); }
    } else {
      const result = await mutation.createRecord("/api/hrm/v2/organizations", { ...deptForm, type: "department" });
      if (result) { setShowAddDept(false); resetDeptForm(); refetch(); }
    }
  };

  const handleSaveDesig = async () => {
    if (editDesig) {
      const result = await mutation.updateRecord(`/api/hrm/v2/organizations?id=${editDesig.id}`, { ...desigForm, type: "designation" });
      if (result) { setEditDesig(null); setShowAddDesig(false); refetchDesigs(); }
    } else {
      const result = await mutation.createRecord("/api/hrm/v2/organizations", { ...desigForm, type: "designation" });
      if (result) { setShowAddDesig(false); resetDesigForm(); refetchDesigs(); }
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const result = await mutation.deleteRecord(`/api/hrm/v2/organizations?id=${deleteItem.id}&type=${deleteItem.type}`);
    if (result) {
      refetch();
      refetchDesigs();
      setDeleteItem(null);
    }
  };

  const openEditDept = (dept: any) => {
    setEditDept(dept);
    setDeptForm({
      name: dept.name || "",
      code: dept.code || "",
      organizationId: dept.organizationId || "",
      headUserId: dept.headUserId || "",
      status: dept.status || "active",
    });
    setShowAddDept(true);
  };

  const openEditDesig = (des: any) => {
    setEditDesig(des);
    setDesigForm({
      name: des.name || "",
      grade: des.grade || "",
      level: String(des.level || "1"),
      organizationId: des.organizationId || "",
    });
    setShowAddDesig(true);
  };

  const safeDepts = departments || [];
  const safeDesigs = designations || [];

  return (
    <AppShell title="Organization">
      <PageHeader
        title="Organization"
        description="Manage departments, designations, business units, and locations."
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetDeptForm(); setShowAddDept(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Department
          </Button>
          <Button onClick={() => { resetDesigForm(); setShowAddDesig(true); }}>
            <Building2 className="mr-2 h-4 w-4" />
            Add Designation
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Departments", value: safeDepts.length || "—", icon: Briefcase, color: "text-primary" },
          { label: "Designations", value: safeDesigs.length || "—", icon: Users, color: "text-info" },
          { label: "Locations", value: "—", icon: MapPin, color: "text-success" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <LayoutGrid className="h-4 w-4 text-muted" />
            </div>
            <p className="text-2xl font-bold text-dark dark:text-white">{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Departments */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-dark dark:text-white">Departments</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search departments..."
              className="pl-9 h-8 text-sm w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />))}</div>
        ) : safeDepts.length > 0 ? (
          <div className="divide-y divide-border">
            {safeDepts.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-info flex items-center justify-center text-white"><Briefcase className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-medium text-dark dark:text-white">{dept.name}</p>
                    <p className="text-xs text-muted">{dept.headUserId ? `Head: ${dept.headUserId}` : dept.code || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info" size="sm">{dept.status || "active"}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDept(dept)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger" onClick={() => setDeleteItem({ type: "department", id: dept.id, name: dept.name })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center"><Building2 className="h-10 w-10 text-muted mx-auto mb-3" /><p className="text-sm text-muted">No departments configured yet.</p></div>
        )}
      </div>

      {/* Designations + Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold text-dark dark:text-white">Designations</h3></div>
          {safeDesigs.length > 0 ? (
            <div className="divide-y divide-border">
              {safeDesigs.map((des) => (
                <div key={des.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-warning flex items-center justify-center text-white"><Users className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-dark dark:text-white">{des.name}</p>
                      <p className="text-xs text-muted">{des.grade ? `Grade ${des.grade}` : `Level ${des.level || "—"}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDesig(des)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger" onClick={() => setDeleteItem({ type: "designation", id: des.id, name: des.name })}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center"><p className="text-sm text-muted">No designations configured.</p></div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-bold text-dark dark:text-white">Locations</h3></div>
          <div className="p-6 text-center"><MapPin className="h-8 w-8 text-muted mx-auto mb-2" /><p className="text-sm text-muted">No locations configured.</p></div>
        </div>
      </div>

      {/* Add/Edit Department Dialog */}
      <Dialog open={showAddDept} onOpenChange={setShowAddDept}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                <Briefcase className="h-4 w-4 text-info" />
              </div>
              {editDept ? "Edit Department" : "Add Department"}
            </DialogTitle>
            <DialogDescription>{editDept ? "Update department details." : "Create a new department."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveDept(); }} className="space-y-6">
            <FormSection title="Department Info" icon={<Briefcase className="h-4 w-4" />} columns={2}>
              <div className="col-span-full">
                <FormInput
                  label="Department Name"
                  icon={<Briefcase className="h-4 w-4" />}
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  required
                  placeholder="Engineering"
                />
              </div>
              <FormInput
                label="Code"
                icon={<Building2 className="h-4 w-4" />}
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                placeholder="ENG"
              />
              <FormSelect
                label="Status"
                icon={<LayoutGrid className="h-4 w-4" />}
                value={deptForm.status}
                onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => { setShowAddDept(false); resetDeptForm(); }}
              submitLabel={editDept ? "Save Changes" : "Create Department"}
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Designation Dialog */}
      <Dialog open={showAddDesig} onOpenChange={setShowAddDesig}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Users className="h-4 w-4 text-warning" />
              </div>
              {editDesig ? "Edit Designation" : "Add Designation"}
            </DialogTitle>
            <DialogDescription>{editDesig ? "Update designation details." : "Create a new designation."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveDesig(); }} className="space-y-6">
            <FormSection title="Designation Info" icon={<Users className="h-4 w-4" />} columns={2}>
              <div className="col-span-full">
                <FormInput
                  label="Designation Name"
                  icon={<Users className="h-4 w-4" />}
                  value={desigForm.name}
                  onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
                  required
                  placeholder="Senior Developer"
                />
              </div>
              <FormInput
                label="Grade"
                icon={<Building2 className="h-4 w-4" />}
                value={desigForm.grade}
                onChange={(e) => setDesigForm({ ...desigForm, grade: e.target.value })}
                placeholder="L3"
              />
              <FormInput
                label="Level"
                type="number"
                icon={<LayoutGrid className="h-4 w-4" />}
                value={desigForm.level}
                onChange={(e) => setDesigForm({ ...desigForm, level: e.target.value })}
                min="1"
              />
            </FormSection>
            {mutation.error && (
              <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>
            )}
            <FormActions
              onCancel={() => { setShowAddDesig(false); resetDesigForm(); }}
              submitLabel={editDesig ? "Save Changes" : "Create Designation"}
              loading={mutation.loading}
            />
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10">
                <Trash2 className="h-4 w-4 text-danger" />
              </div>
              Delete {deleteItem?.type === "department" ? "Department" : "Designation"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {mutation.error && <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20">{mutation.error}</div>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteItem(null)} disabled={mutation.loading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={mutation.loading}>
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
