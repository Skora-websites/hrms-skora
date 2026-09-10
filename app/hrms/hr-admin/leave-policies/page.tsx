"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

interface LeaveType {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  maxBalance: number;
  accrualRate?: string;
  isPaid: boolean;
  color?: string;
  description?: string;
  carryForward?: boolean;
}

const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { name: "Casual Leave (CL)", code: "CL", maxBalance: 12, accrualRate: "1/month", isPaid: true, color: "emerald", description: "Standard personal and emergency leave" },
  { name: "Sick Leave (SL)", code: "SL", maxBalance: 12, accrualRate: "1/month", isPaid: true, color: "blue", description: "Medical and health-related leave" },
  { name: "Annual Leave (AL)", code: "AL", maxBalance: 24, accrualRate: "2/month", isPaid: true, color: "purple", description: "Earned vacation leave with carry-forward", carryForward: true },
  { name: "Maternity Leave (ML)", code: "ML", maxBalance: 180, accrualRate: "N/A", isPaid: true, color: "pink", description: "Statutory paid maternity leave" },
  { name: "Paternity Leave (PL)", code: "PL", maxBalance: 5, accrualRate: "N/A", isPaid: true, color: "cyan", description: "Paid paternity time off" },
];

export default function HrAdminLeavePoliciesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [deletingType, setDeletingType] = useState<LeaveType | null>(null);

  // Form State
  const [formData, setFormData] = useState<LeaveType>({
    name: "",
    code: "",
    maxBalance: 12,
    accrualRate: "1/month",
    isPaid: true,
    color: "emerald",
    description: "",
    carryForward: false,
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/leaves?type=types");
      if (res.ok) {
        const data = await res.json();
        const types = Array.isArray(data.data) ? data.data : [];
        if (types.length === 0) {
          // Auto-seed default leave types into MongoDB
          await seedDefaultTypes();
        } else {
          setLeaveTypes(types.map((t: any) => ({
            ...t,
            id: t.id || t._id,
            accrualRate: t.accrualRate || t.accrual || "1/month",
            isPaid: t.isPaid !== undefined ? t.isPaid : (t.paid !== undefined ? t.paid : true),
            color: t.color || "emerald",
          })));
        }
      }
    } catch {
      showToast("Failed to load leave policies", "error");
    }
    setLoading(false);
  };

  const seedDefaultTypes = async () => {
    try {
      for (const def of DEFAULT_LEAVE_TYPES) {
        await fetch("/api/hrm/v2/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_type",
            ...def,
          }),
        });
      }
      const res = await fetch("/api/hrm/v2/leaves?type=types");
      if (res.ok) {
        const data = await res.json();
        setLeaveTypes(data.data || []);
      }
    } catch {
      setLeaveTypes(DEFAULT_LEAVE_TYPES);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: "",
      code: "",
      maxBalance: 12,
      accrualRate: "1/month",
      isPaid: true,
      color: "emerald",
      description: "",
      carryForward: false,
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (lt: LeaveType) => {
    setEditingType(lt);
    setFormData({
      name: lt.name,
      code: lt.code,
      maxBalance: lt.maxBalance || 12,
      accrualRate: lt.accrualRate || "1/month",
      isPaid: lt.isPaid ?? true,
      color: lt.color || "emerald",
      description: lt.description || "",
      carryForward: lt.carryForward ?? false,
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast("Please enter name and code", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_type",
          ...formData,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          maxBalance: Number(formData.maxBalance),
        }),
      });
      if (res.ok) {
        showToast("Leave type created successfully!");
        setShowAddModal(false);
        loadLeaveTypes();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create leave type", "error");
      }
    } catch {
      showToast("Network error creating leave type", "error");
    }
    setSaving(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;
    setSaving(true);
    try {
      const id = editingType.id || editingType._id;
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_type",
          id,
          ...formData,
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          maxBalance: Number(formData.maxBalance),
        }),
      });
      if (res.ok) {
        showToast("Leave type updated successfully!");
        setEditingType(null);
        loadLeaveTypes();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update leave type", "error");
      }
    } catch {
      showToast("Network error updating leave type", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    setSaving(true);
    try {
      const id = deletingType.id || deletingType._id;
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_type",
          id,
        }),
      });
      if (res.ok) {
        showToast("Leave type deleted successfully!");
        setDeletingType(null);
        loadLeaveTypes();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete leave type", "error");
      }
    } catch {
      showToast("Network error deleting leave type", "error");
    }
    setSaving(false);
  };

  const colorBadge = (color?: string) => {
    switch (color) {
      case "emerald": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "blue": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "purple": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "pink": return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
      case "cyan": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      default: return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  return (
    <AppShell title="Leave Policies">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md ${
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Leave Policies &amp; Types
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure annual quotas, monthly accrual rates, carry-forward and paid leave terms
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-primary text-white hover:bg-primary/90 gap-2 font-bold text-xs shadow-md"
        >
          <Plus className="h-4 w-4" /> Add Leave Type
        </Button>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Configured Policies</span>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {leaveTypes.length} Types
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Paid Leave Types</span>
            <Shield className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {leaveTypes.filter((t) => t.isPaid).length} Active
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm text-slate-900 dark:text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carry-Forward Enabled</span>
            <Clock className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
            {leaveTypes.filter((t) => t.carryForward).length} Policies
          </p>
        </div>
      </div>

      {/* Leave Types Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading leave policies from MongoDB...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {leaveTypes.map((lt) => (
            <div
              key={lt.id || lt.code}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                      {lt.name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border mt-1 ${colorBadge(lt.color)}`}>
                      Code: {lt.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(lt)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg"
                      title="Edit Policy"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingType(lt)}
                      className="h-8 w-8 p-0 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                      title="Delete Policy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {lt.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {lt.description}
                  </p>
                )}

                <div className="space-y-2.5 text-xs pt-2 border-t border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Annual Quota</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lt.maxBalance} Days / Year</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Accrual Frequency</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{lt.accrualRate || "Monthly"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Payment Status</span>
                    <span className={`font-bold ${lt.isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {lt.isPaid ? "Paid Leave" : "Unpaid Leave"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Carry Forward</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {lt.carryForward ? "Allowed" : "Expires year-end"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ ADD LEAVE TYPE MODAL ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Add New Leave Type
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Configure annual allocation and accrual rules
            </p>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Leave Policy Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Compensatory Off (Comp-Off)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Short Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CO"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Max Balance (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={formData.maxBalance}
                    onChange={(e) => setFormData({ ...formData, maxBalance: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Accrual Frequency</label>
                  <input
                    type="text"
                    placeholder="e.g. 1/month"
                    value={formData.accrualRate || ""}
                    onChange={(e) => setFormData({ ...formData, accrualRate: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Theme Color</label>
                  <select
                    value={formData.color || "emerald"}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  >
                    <option value="emerald">Emerald Green</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="pink">Pink</option>
                    <option value="cyan">Cyan</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="font-semibold block">Paid Leave</span>
                  <span className="text-[10px] text-slate-500">Employee receives full pay during time off</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="font-semibold block">Carry Forward to Next Year</span>
                  <span className="text-[10px] text-slate-500">Unused balance rolls over annually</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.carryForward}
                  onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional policy guidelines..."
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white font-bold text-xs gap-1"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Create Policy
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT LEAVE TYPE MODAL ═══ */}
      {editingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-primary" /> Edit Leave Policy
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update {editingType.name} parameters
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Leave Policy Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Short Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Max Balance (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={formData.maxBalance}
                    onChange={(e) => setFormData({ ...formData, maxBalance: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Accrual Frequency</label>
                  <input
                    type="text"
                    value={formData.accrualRate || ""}
                    onChange={(e) => setFormData({ ...formData, accrualRate: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Theme Color</label>
                  <select
                    value={formData.color || "emerald"}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  >
                    <option value="emerald">Emerald Green</option>
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="pink">Pink</option>
                    <option value="cyan">Cyan</option>
                    <option value="orange">Orange</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="font-semibold block">Paid Leave</span>
                  <span className="text-[10px] text-slate-500">Employee receives full pay during time off</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isPaid}
                  onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="font-semibold block">Carry Forward</span>
                  <span className="text-[10px] text-slate-500">Unused balance rolls over annually</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.carryForward}
                  onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingType(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-white font-bold text-xs gap-1"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {deletingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl text-slate-900 dark:text-white space-y-4">
            <h3 className="font-bold text-base text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Leave Policy
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete policy <strong>{deletingType.name}</strong> ({deletingType.code})?
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingType(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={saving}
                onClick={handleDelete}
                className="text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
