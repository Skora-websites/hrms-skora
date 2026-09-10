"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Mail,
  X,
  RefreshCw,
  Building2,
  Briefcase,
  Shield,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  UserX,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  _id?: string;
  name?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  department?: string;
  departmentName?: string;
  designation?: string;
  designationName?: string;
  status: string;
  employeeCode?: string;
  reportingManager?: string;
  employmentType?: string;
  phone?: string;
}

export default function HrAdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Employee Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    department: "Engineering",
    designation: "Software Engineer",
    role: "employee",
    reportingManager: "",
    employmentType: "permanent",
    phone: "",
    status: "active",
  });
  const [adding, setAdding] = useState(false);

  // Edit Employee Modal State
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    role: "employee",
    reportingManager: "",
    status: "active",
    phone: "",
    employeeCode: "",
  });
  const [editing, setEditing] = useState(false);

  // Delete Employee State
  const [deleteEmp, setDeleteEmp] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load Employees from API ──────────────────────────────
  const loadEmployees = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/hrm/v2/employees");
      if (res.ok) {
        const json = await res.json();
        const rawData = Array.isArray(json.data) ? json.data : [];
        const normalized = rawData.map((e: any) => ({
          ...e,
          id: e.id || e._id || "",
          name: e.displayName || e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email,
          department: e.department || e.departmentName || "General",
          designation: e.designation || e.designationName || "Staff",
          status: e.status || "active",
          role: e.role || "employee",
        }));
        setEmployees(normalized);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  // ── Add Employee Submit ──────────────────────────────────
  const handleAdd = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!newEmp.name || !newEmp.email) {
      showToast("Please provide both name and email.", true);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/hrm/v2/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setNewEmp({
          name: "",
          email: "",
          department: "Engineering",
          designation: "Software Engineer",
          role: "employee",
          reportingManager: "",
          employmentType: "permanent",
          phone: "",
          status: "active",
        });
        showToast("Employee added successfully!");
        loadEmployees(true);
      } else {
        showToast(data.error || "Failed to add employee", true);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add employee", true);
    } finally {
      setAdding(false);
    }
  };

  // ── Open Edit Modal ──────────────────────────────────────
  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setEditData({
      name: emp.name || "",
      email: emp.email || "",
      department: emp.department || "General",
      designation: emp.designation || "Staff",
      role: emp.role || "employee",
      reportingManager: emp.reportingManager || "",
      status: emp.status || "active",
      phone: emp.phone || "",
      employeeCode: emp.employeeCode || "",
    });
  };

  // ── Edit Employee Submit ─────────────────────────────────
  const handleEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editEmp) return;
    setEditing(true);
    try {
      const targetId = editEmp.id || editEmp._id;
      const res = await fetch(`/api/hrm/v2/employees?id=${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId, ...editData }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditEmp(null);
        showToast("Employee updated successfully!");
        loadEmployees(true);
      } else {
        showToast(data.error || "Failed to update employee", true);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update employee", true);
    } finally {
      setEditing(false);
    }
  };

  // ── Delete Employee Submit ───────────────────────────────
  const handleDelete = async () => {
    if (!deleteEmp) return;
    setDeleting(true);
    try {
      const targetId = deleteEmp.id || deleteEmp._id;
      const res = await fetch(`/api/hrm/v2/employees?id=${targetId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteEmp(null);
        showToast("Employee deleted successfully!");
        loadEmployees(true);
      } else {
        showToast(data.error || "Failed to delete employee", true);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete employee", true);
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtered List ────────────────────────────────────────
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const ms =
        (e.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.employeeCode || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.designation || "").toLowerCase().includes(search.toLowerCase());

      const md = filterDept === "all" || (e.department || "").toLowerCase() === filterDept.toLowerCase();
      const mst = filterStatus === "all" || (e.status || "").toLowerCase() === filterStatus.toLowerCase();

      return ms && md && mst;
    });
  }, [employees, search, filterDept, filterStatus]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const activeCount = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.filter((e) => e.status !== "active").length;

  return (
    <AppShell title="Employee Directory">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold shadow-xl backdrop-blur-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Employee Directory</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              Live Database
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage organization members, assignments, roles, and profile information · {employees.length} Total Workforce
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => loadEmployees(false)}
            disabled={refreshing}
            className="text-xs font-semibold gap-1.5 border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            onClick={() => setShowAdd(true)}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-2 shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">TOTAL WORKFORCE</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{employees.length}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">ACTIVE STATUS</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeCount}</p>
        </div>

        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400">INACTIVE / ON LEAVE</span>
            <UserX className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{inactiveCount}</p>
        </div>

        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">DEPARTMENTS</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{departments.length}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee code, designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-sm"
          />
        </div>

        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-sm cursor-pointer"
        >
          <option value="all">All Departments ({departments.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-sm cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Employee Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary mb-2" />
            Loading real employee directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No employees match the current search filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="pb-3 pr-4">Employee</th>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Designation</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filtered.map((emp) => (
                  <tr key={emp.id || emp._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    {/* Employee info */}
                    <td className="py-3 pr-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{emp.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        {emp.email}
                      </span>
                    </td>

                    {/* Employee Code */}
                    <td className="py-3 pr-4 font-mono font-bold text-primary text-[11px]">
                      {emp.employeeCode || "—"}
                    </td>

                    {/* Department */}
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 font-medium">
                      {emp.department || "General"}
                    </td>

                    {/* Designation */}
                    <td className="py-3 pr-4 text-slate-700 dark:text-slate-300">
                      {emp.designation || "Staff"}
                    </td>

                    {/* Role */}
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 uppercase">
                        <Shield className="h-2.5 w-2.5 text-primary" />
                        {emp.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          emp.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(emp)}
                          className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg"
                          title="Edit Employee"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteEmp(emp)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                          title="Delete Employee"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* ═══ ADD EMPLOYEE MODAL ═══ */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-lg">Add New Employee</h3>
                <p className="text-xs text-slate-500">Creates user profile directly in live database</p>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ankit Sharma"
                  value={newEmp.name}
                  onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. employee@company.com"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Engineer"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({ ...newEmp, designation: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr_admin">HR Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                  <select
                    value={newEmp.employmentType}
                    onChange={(e) => setNewEmp({ ...newEmp, employmentType: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="probation">Probation</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={newEmp.phone}
                  onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={adding} className="bg-primary hover:bg-primary/90 text-white font-bold gap-2">
                  {adding ? "Creating..." : "Add Employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT EMPLOYEE MODAL ═══ */}
      {editEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="font-bold text-lg">Edit Employee Profile</h3>
                <p className="text-xs text-slate-500">Editing: {editEmp.email}</p>
              </div>
              <button
                onClick={() => setEditEmp(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editData.designation}
                    onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                  <select
                    value={editData.role}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr_admin">HR Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Code</label>
                <input
                  type="text"
                  value={editData.employeeCode}
                  onChange={(e) => setEditData({ ...editData, employeeCode: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setEditEmp(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editing} className="bg-primary hover:bg-primary/90 text-white font-bold">
                  {editing ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {deleteEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg text-red-600 dark:text-red-400">Delete Employee</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{deleteEmp.name}</strong> ({deleteEmp.email}) from the live database?
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
              <Button variant="outline" onClick={() => setDeleteEmp(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
