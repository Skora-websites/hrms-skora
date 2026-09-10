"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  CalendarDays,
  DollarSign,
  ClipboardList,
  Shield,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Navigation,
  Send,
  Briefcase,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";

// ── Types ──────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  employeeCode?: string;
  reportingManager?: string;
  joiningDate?: string;
}

interface PendingCandidate {
  id: string;
  _id?: string;
  userId?: string;
  employeeName?: string;
  name?: string;
  email: string;
  role?: string;
  department?: string;
  documentName?: string;
  documentUrl?: string;
  status: string;
  employeeCode?: string;
  submittedAt?: string;
  createdAt?: string;
  deadlineHoursRemaining?: number;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  userId?: string;
  type: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: "employee" | "manager";
  leaveTypeId?: string;
}

// ── Main Component ─────────────────────────────────────────

export default function HrAdminDashboardPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<PendingCandidate[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Add employee modal
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    department: "",
    designation: "",
    reportingManager: "",
    employmentType: "permanent",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, candRes, leaveRes] = await Promise.all([
        fetch("/api/hrm/v2/employees"),
        fetch("/api/hrm/v2/onboarding?pending=true"),
        fetch("/api/hrm/v2/leaves?status=pending"),
      ]);
      if (empRes.ok) setEmployees((await empRes.json()).data || []);
      if (candRes.ok) setPendingCandidates((await candRes.json()).data || []);
      if (leaveRes.ok) setLeaveRequests((await leaveRes.json()).data || []);
    } catch {
      // use empty state
    }
    setLoading(false);
  };

  const handleApproveCandidate = async (candidate: PendingCandidate) => {
    const id = candidate.id || candidate._id || "";
    const code = `EMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      // 1. Mark onboarding task as completed
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: id, status: "completed" }),
      });
      // 2. Update user status to active and assign employee code
      if (candidate.userId || candidate.email) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: candidate.userId || candidate.email,
            action: "status",
            status: "active",
          }),
        });
        // 3. Assign employee code to user record
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: candidate.userId || candidate.email,
            employeeCode: code,
          }),
        });
        // 4. Update the onboarding task with the employee code
        await fetch("/api/hrm/v2/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_task", taskId: id, status: "completed", employeeCode: code }),
        });
      }
      if (res.ok) {
        setPendingCandidates((prev) =>
          prev.map((c) =>
            (c.id || c._id) === id ? { ...c, status: "completed", employeeCode: code } : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to approve candidate:", err);
    }
  };

  const handleRejectCandidate = async (candidate: PendingCandidate) => {
    const id = candidate.id || candidate._id || "";
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", taskId: id, status: "rejected" }),
      });
      if (res.ok) {
        setPendingCandidates((prev) =>
          prev.map((c) =>
            (c.id || c._id) === id
              ? { ...c, status: "rejected", deadlineHoursRemaining: 48 }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to reject candidate:", err);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hrm/v2/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      if (res.ok) {
        setShowAddEmployee(false);
        setNewEmployee({
          name: "",
          email: "",
          department: "",
          designation: "",
          reportingManager: "",
          employmentType: "permanent",
        });
        loadData();
      }
    } catch {
      // ignore
    }
  };

  const handleApproveLeave = async (request: LeaveRequest) => {
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id: request.id, approvedById: user?.id }),
      });
      if (res.ok) {
        setLeaveRequests((prev) => prev.map((l) => l.id === request.id ? { ...l, status: "approved" as const } : l));
      }
    } catch (err) {
      console.error("Failed to approve leave:", err);
    }
  };

  const handleRejectLeave = async (request: LeaveRequest) => {
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id: request.id, approvedById: user?.id, reason: "Rejected by HR Admin" }),
      });
      if (res.ok) {
        setLeaveRequests((prev) => prev.map((l) => l.id === request.id ? { ...l, status: "rejected" as const } : l));
      }
    } catch (err) {
      console.error("Failed to reject leave:", err);
    }
  };

  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const managerLeaves = pendingLeaves.filter((l) => l.requestedBy === "manager");
  const employeeLeaves = pendingLeaves.filter((l) => l.requestedBy === "employee");

  return (
    <AppShell title="HR Admin Dashboard">
      {/* ═══ Header Banner — Personal Profile ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name || "HR Admin"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Employee Directory · Onboarding · Payroll · Projects &amp; Budgets · Leave Management
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Users className="h-3.5 w-3.5" /> {employees.length} Employees
              </span>
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <Clock className="h-3.5 w-3.5" /> {pendingCandidates.filter((c) => c.status === "pending").length} Pending Onboarding
              </span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <CalendarDays className="h-3.5 w-3.5" /> {pendingLeaves.length} Leave Requests
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Personal Punch In/Out ═══ */}
      <div className="mb-6">
        <AttendancePunchCard />
      </div>

      {/* ═══ Stats Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStat icon={<Users className="h-5 w-5 text-primary" />} label="Total Employees" value={employees.length} />
        <MiniStat icon={<UserCheck className="h-5 w-5 text-emerald-500" />} label="Pending Onboarding" value={pendingCandidates.filter((c) => c.status === "pending").length} />
        <MiniStat icon={<CalendarDays className="h-5 w-5 text-orange-500" />} label="Pending Leaves" value={pendingLeaves.length} />
        <MiniStat icon={<ClipboardList className="h-5 w-5 text-blue-500" />} label="Manager Requests" value={managerLeaves.length} />
      </div>

      {/* ═══ HR & Onboarding Module ═══ */}
      <DashboardSection
        title="HR & Onboarding Module"
        subtitle="Add employees, verify documents, assign roles/managers"
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        action={
          <Button
            size="sm"
            onClick={() => setShowAddEmployee(true)}
            className="bg-primary text-white font-bold text-xs"
          >
            <Users className="h-3.5 w-3.5 mr-1" /> Add Employee
          </Button>
        }
      >
        {/* Pending candidates for verification */}
        {pendingCandidates.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              Document Verification Queue
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="pb-2 font-semibold">Candidate</th>
                    <th className="pb-2 font-semibold">Role / Dept</th>
                    <th className="pb-2 font-semibold">Document</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">Employee Code</th>
                    <th className="pb-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {pendingCandidates.map((c) => (
                    <tr key={c.id || c._id}>
                      <td className="py-2 font-bold">
                        {c.employeeName || c.name || c.email}
                        <span className="block text-[10px] text-slate-500 font-normal">{c.email}</span>
                      </td>
                      <td className="py-2">
                        <span className="font-semibold">{c.role || "Employee"}</span>
                        <span className="block text-[10px] text-slate-500">{c.department || "—"}</span>
                      </td>
                      <td className="py-2 text-primary font-mono text-[11px] underline cursor-pointer">
                        <FileText className="h-3 w-3 inline mr-1" />{c.documentName || "No document"}
                      </td>
                      <td className="py-2">
                        {c.status === "approved" ? (
                          <StatusChip color="emerald">VERIFIED</StatusChip>
                        ) : c.status === "rejected_48h" ? (
                          <StatusChip color="red">REJECTED ({c.deadlineHoursRemaining}h)</StatusChip>
                        ) : (
                          <StatusChip color="yellow">PENDING</StatusChip>
                        )}
                      </td>
                      <td className="py-2 font-mono font-bold text-primary">
                        {c.employeeCode || <span className="text-slate-400 font-normal text-[10px]">Pending</span>}
                      </td>
                      <td className="py-2 text-right">
                        {c.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => handleApproveCandidate(c)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2">
                              <Shield className="h-3 w-3 mr-0.5" /> Approve
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleRejectCandidate(c)} className="text-[10px] font-bold h-7 px-2">
                              <XCircle className="h-3 w-3 mr-0.5" /> Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent employees */}
        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Recent Employees</h4>
        {employees.length === 0 ? (
          <EmptyState message="No employees yet. Add your first employee to get started." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.slice(0, 6).map((emp) => (
              <div key={emp.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-slate-50 dark:bg-black/30 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">{emp.name}</span>
                  <StatusChip color={emp.status === "active" ? "emerald" : "yellow"}>{emp.status}</StatusChip>
                </div>
                <span className="text-slate-500 dark:text-slate-400 block">{emp.department} · {emp.designation}</span>
                {emp.employeeCode && (
                  <span className="text-primary font-mono font-bold text-[10px]">{emp.employeeCode}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardSection>

      {/* ═══ Leave & Attendance Master ═══ */}
      <DashboardSection
        title="Leave & Attendance Master"
        subtitle="Manage attendance data, approve Manager & Employee leave requests"
        icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Manager leave requests (primary approver) */}
          <div>
            <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Manager Leave Requests (Primary Approver)
            </h4>
            {managerLeaves.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                No pending manager leave requests
              </div>
            ) : (
              <div className="space-y-2">
                {managerLeaves.map((l) => (
                  <LeaveRequestCard key={l.id} request={l} onApprove={handleApproveLeave} onReject={handleRejectLeave} />
                ))}
              </div>
            )}
          </div>

          {/* Employee leave requests (fallback approver) */}
          <div>
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Employee Leave Requests (Fallback Approver)
            </h4>
            {employeeLeaves.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                No pending employee leave requests
              </div>
            ) : (
              <div className="space-y-2">
                {employeeLeaves.map((l) => (
                  <LeaveRequestCard key={l.id} request={l} onApprove={handleApproveLeave} onReject={handleRejectLeave} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardSection>

      {/* ═══ Project & Budget Setup ═══ */}
      <DashboardSection
        title="Project & Budget Setup"
        subtitle="Create projects, set client budgets, assign Project Managers"
        icon={<Briefcase className="h-5 w-5 text-blue-500" />}
        action={
          <a href="/hrms/projects/all">
            <Button size="sm" className="bg-primary text-white font-bold text-xs">
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Create Project
            </Button>
          </a>
        }
      >
        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
          <Briefcase className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold mb-1">Project & Budget Management</p>
          <p>Create projects with client budgets and assign Project Managers.</p>
          <a href="/hrms/projects/all">
            <Button size="sm" className="mt-3 bg-primary text-white font-bold text-xs">
              Create First Project
            </Button>
          </a>
        </div>
      </DashboardSection>

      {/* ═══ Payroll Module ═══ */}
      <DashboardSection
        title="Payroll Module"
        subtitle="Run end-of-month payroll: locked timesheets, deductions, overtime, payslips"
        icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
        action={
          <a href="/hrms/hr-admin/payroll">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
              <DollarSign className="h-3.5 w-3.5 mr-1" /> Run Payroll
            </Button>
          </a>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-500 block">Locked Timesheets</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">0</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-500 block">Approved Overtime</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">0h</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-500 block">Deductions</span>
            <span className="text-lg font-extrabold text-red-600 dark:text-red-400">₹0</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-center">
            <span className="text-[10px] text-slate-500 block">Net Pay</span>
            <span className="text-lg font-extrabold text-primary">₹0</span>
          </div>
        </div>
        <EmptyState message="Run your first payroll to see calculations here. Payroll fetches locked timesheets and pays out approved overtime." />
      </DashboardSection>

      {/* ═══ Add Employee Modal ═══ */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Add New Employee
            </h3>
            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <ModalInput label="Full Name" value={newEmployee.name} onChange={(v) => setNewEmployee({ ...newEmployee, name: v })} required />
              <ModalInput label="Email" value={newEmployee.email} onChange={(v) => setNewEmployee({ ...newEmployee, email: v })} type="email" required />
              <ModalInput label="Department" value={newEmployee.department} onChange={(v) => setNewEmployee({ ...newEmployee, department: v })} required />
              <ModalInput label="Designation" value={newEmployee.designation} onChange={(v) => setNewEmployee({ ...newEmployee, designation: v })} required />
              <ModalInput label="Reporting Manager" value={newEmployee.reportingManager} onChange={(v) => setNewEmployee({ ...newEmployee, reportingManager: v })} />
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employment Type</label>
                <select
                  value={newEmployee.employmentType}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employmentType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="permanent">Permanent</option>
                  <option value="contract">Contract</option>
                  <option value="probation">Probation</option>
                  <option value="intern">Intern</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button type="button" variant="outline" onClick={() => setShowAddEmployee(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-white font-bold gap-2">
                  <Users className="h-3.5 w-3.5" /> Add Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}

function DashboardSection({
  title, subtitle, icon, action, children,
}: {
  title: string; subtitle: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">{icon} {title}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatusChip({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    yellow: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${colors[color] || colors.blue}`}>
      {children}
    </span>
  );
}

function LeaveRequestCard({ request, onApprove, onReject }: { request: LeaveRequest; onApprove: (req: LeaveRequest) => void; onReject: (req: LeaveRequest) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
      <div>
        <span className="font-bold text-slate-900 dark:text-white block">{request.employeeName}</span>
        <span className="text-slate-500">{request.type} · {request.totalDays}d · {request.reason}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={() => onApprove(request)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2">
          <CheckCircle2 className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="danger" onClick={() => onReject(request)} className="text-[10px] font-bold h-7 px-2">
          <XCircle className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
      {message}
    </div>
  );
}

function ModalInput({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
      />
    </div>
  );
}
