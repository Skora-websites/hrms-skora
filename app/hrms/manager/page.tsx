"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
  Download,
  TrendingUp,
  ClipboardList,
  AlertCircle,
  Briefcase,
  Activity,
  Shield,
  MapPin,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { AttendancePunchCard } from "@/components/hr/attendance-punch-card";

// ── Types ──────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  employeeCode?: string;
  punchInTime?: string;
  punchOutTime?: string;
  attendanceStatus?: string;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  halfDaySlot?: "first_half" | "second_half";
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestType: "leave" | "regularization" | "overtime";
}

// ── Live AUX Types ──────────────────────────────────────────
interface LiveStatusEmployee {
  userId: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: string;
  status: string;
  auxState: string | null;
  punchInTime: string | null;
  punchOutTime: string | null;
  effectiveWorkMinutes: number;
  totalBreakMinutes: number;
  workHours: number;
  totalElapsedMinutes: number;
  auxSince: string | null;
  workLocation: "office" | "remote" | null;
}

interface LiveStatusSummary {
  totalEmployees: number;
  punchedIn: number;
  onBreak: number;
  inMeeting: number;
  active: number;
  punchedOut: number;
  absent: number;
  inOffice: number;
  remote: number;
}

// ── Main Component ─────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Live AUX state
  const [liveEmployees, setLiveEmployees] = useState<LiveStatusEmployee[]>([]);
  const [liveSummary, setLiveSummary] = useState<LiveStatusSummary | null>(null);
  const [liveSearch, setLiveSearch] = useState("");
  const [liveFilter, setLiveFilter] = useState<"all" | "punched_in" | "active" | "on_break" | "in_meeting" | "punched_out" | "absent">("all");
  const isCeo = user?.role === "super_admin";
  const managerDepartment = isCeo ? null : (user?.department || null);

  useEffect(() => {
    if (!user) return;
    loadData();
    // Auto-poll every 10s for live AUX updates
    const interval = setInterval(() => loadData(true), 10000);
    const handlePunchUpdate = () => loadData(true);
    window.addEventListener("attendance-updated", handlePunchUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handlePunchUpdate);
    };
  }, [user, managerDepartment]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [teamRes, approvalsRes, liveRes] = await Promise.allSettled([
        fetch("/api/hrm/v2/users?action=list").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/hrm/v2/leaves?status=pending&approver=manager").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/hrm/v2/attendance/live-status").then((r) => (r.ok ? r.json() : null)),
      ]);

      // Filter team members by manager's department
      if (teamRes.status === "fulfilled" && teamRes.value) {
        const allUsers = (teamRes.value.data || []) as any[];
        const filtered = managerDepartment
          ? allUsers.filter((u: any) => {
              const r = (u.role || "").toLowerCase();
              const dept = (u.department || u.departmentName || "").toLowerCase();
              return (r === "employee" || r === "agent") && dept === managerDepartment.toLowerCase();
            })
          : allUsers.filter((u: any) => (u.role === "employee" || u.role === "agent"));
        setTeamMembers(filtered);
      }
      if (approvalsRes.status === "fulfilled" && approvalsRes.value) {
        setPendingApprovals(approvalsRes.value.data || []);
      }
      if (liveRes.status === "fulfilled" && liveRes.value) {
        setLiveEmployees(Array.isArray(liveRes.value.data) ? liveRes.value.data : []);
        if (liveRes.value.summary) setLiveSummary(liveRes.value.summary);
      }
    } catch {
      // use empty state
    }
    setLoading(false);
  };

  const leaveApprovals = pendingApprovals.filter((a) => a.requestType === "leave");
  const regularizationApprovals = pendingApprovals.filter((a) => a.requestType === "regularization");
  const overtimeApprovals = pendingApprovals.filter((a) => a.requestType === "overtime");

  const presentToday = teamMembers.filter(
    (m) => m.attendanceStatus === "PRESENT" || m.attendanceStatus === "LATE"
  ).length;

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id, approvedById: user?.id }),
      });
      if (res.ok) {
        setPendingApprovals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "approved" as const } : a))
        );
      }
    } catch (err) {
      console.error("Failed to approve request:", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id, approvedById: user?.id }),
      });
      if (res.ok) {
        setPendingApprovals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "rejected" as const } : a))
        );
      }
    } catch (err) {
      console.error("Failed to reject request:", err);
    }
  };

  return (
    <AppShell title="Manager Dashboard">
      {/* ═══ Header Banner — Personal Profile ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back, {user?.name || "Manager"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              (managerDepartment ? managerDepartment + " Department" : isCeo ? "All Teams" : "Team Overview") + " · Approvals · Real-Time AUX · Attendance"
            </p>
            <div className="flex items-center gap-3 mt-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Users className="h-3.5 w-3.5" /> {teamMembers.length} Direct Reports
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {presentToday} Present Today
              </span>
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="h-3.5 w-3.5" /> {pendingApprovals.length} Pending Approvals
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
        <StatCard
          icon={<Users className="h-5 w-5 text-emerald-500" />}
          label="Team Members"
          value={teamMembers.length}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />}
          label="Present Today"
          value={presentToday}
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
          label="Leave Requests"
          value={leaveApprovals.length}
          accent="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          label="Overtime Requests"
          value={overtimeApprovals.length}
          accent="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      
      {/* ═══ LIVE AUX DASHBOARD ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Real-Time AUX Status</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {(managerDepartment ? managerDepartment + " Department" : "All Team")} · Auto-refreshes every 10s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              {[["all","All"],["punched_in","Punched In"],["active","Active"],["on_break","On Break"],["in_meeting","In Meeting"],["punched_out","Punched Out"],["absent","Absent"]].map(([k,l]) => (
                <button key={k} onClick={() => setLiveFilter(k as "all" | "punched_in" | "active" | "on_break" | "in_meeting" | "punched_out" | "absent")}
                  className={"px-2 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap " + (liveFilter === k ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900")}>
                  {l}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input type="text" placeholder="Search..." value={liveSearch} onChange={(e) => setLiveSearch(e.target.value)}
                className="w-32 pl-7 pr-2 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        {liveSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
            {([
              [liveSummary.punchedIn, "Punched In", "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", "text-blue-600 dark:text-blue-400"],
              [liveSummary.active, "Active", "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", "text-emerald-600 dark:text-emerald-400"],
              [liveSummary.onBreak, "On Break", "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", "text-amber-600 dark:text-amber-400"],
              [liveSummary.inMeeting, "In Meeting", "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20", "text-purple-600 dark:text-purple-400"],
              [liveSummary.inOffice, "Office", "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", "text-emerald-600 dark:text-emerald-400"],
              [liveSummary.punchedOut, "Punched Out", "bg-slate-50 dark:bg-white/5 border-gray-200 dark:border-white/10", "text-slate-600 dark:text-slate-400"],
              [liveSummary.absent, "Absent", "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20", "text-red-600 dark:text-red-400"],
            ] as const).map(([v, l, bg, txt]) => (
              <div key={l} className={"text-center p-3 rounded-xl border " + bg}>
                <p className={"text-lg font-extrabold " + txt}>{v}</p>
                <p className={"text-[10px] font-medium " + txt}>{l}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {liveEmployees
            .filter((emp) => {
              if (liveFilter === "punched_in") return emp.status === "punched_in";
              if (liveFilter === "active") return emp.status === "punched_in" && emp.auxState === "active";
              if (liveFilter === "on_break") return emp.status === "punched_in" && emp.auxState === "on_break";
              if (liveFilter === "in_meeting") return emp.status === "punched_in" && emp.auxState === "meeting";
              if (liveFilter === "punched_out") return emp.status === "punched_out";
              if (liveFilter === "absent") return emp.status === "absent";
              return true;
            })
            .filter((emp) => {
              if (!liveSearch) return true;
              const q = liveSearch.toLowerCase();
              return emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q) || emp.employeeCode.toLowerCase().includes(q);
            })
            .map((emp) => {
              const auxLabel = emp.auxState === "on_break" ? "On Break" : emp.auxState === "meeting" ? "In Meeting" : emp.auxState === "active" ? "Active" : "—";
              const auxCls = emp.auxState === "on_break" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                : emp.auxState === "meeting" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";
              const statusBg = emp.status === "punched_in" ? "bg-white dark:bg-black/30 border-gray-100 dark:border-white/5 hover:shadow-md"
                : emp.status === "punched_out" ? "bg-slate-50 dark:bg-black/20 border-gray-100 dark:border-white/5 opacity-70"
                : "bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10";
              const avatarBg = emp.status === "punched_in" ? "bg-emerald-500" : emp.status === "punched_out" ? "bg-slate-400" : "bg-red-400";
              return (
                <div key={emp.userId} className={"flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all " + statusBg}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={"w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 " + avatarBg}>{emp.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{emp.name}</span>
                        <span className="font-mono text-[10px] text-primary font-bold">{emp.employeeCode}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{emp.department} · {emp.designation}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {emp.status === "punched_in" && (<>
                      <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (emp.workLocation === "remote" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30")}>
                        {emp.workLocation === "remote" ? "🏠 Remote" : "🏢 Office"}
                      </span>
                      <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + auxCls}>{auxLabel}</span>
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{Math.floor(emp.effectiveWorkMinutes / 60)}h {emp.effectiveWorkMinutes % 60}m</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Work</p>
                      </div>
                      {emp.totalBreakMinutes > 0 && (<div className="text-center min-w-[60px]">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{emp.totalBreakMinutes}m</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Break</p>
                      </div>)}
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{emp.punchInTime ? new Date(emp.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Punch In</p>
                      </div>
                    </>)}
                    {emp.status === "punched_out" && (<>
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{emp.punchInTime ? new Date(emp.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">In</p>
                      </div>
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{emp.punchOutTime ? new Date(emp.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Out</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30">{emp.workHours}h logged</span>
                    </>)}
                    {emp.status === "absent" && (<span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Not Punched In</span>)}
                  </div>
                </div>
              );
            })}
          {liveEmployees.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">No attendance data available yet</p>
            </div>
          )}
        </div>
      </div>

{/* ═══ Approval Center ═══ */}
      <DashboardSection
        title="Approval Center"
        subtitle="Review and manage team leave, regularization, and overtime requests"
        icon={<Shield className="h-5 w-5 text-orange-500" />}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Leave Requests */}
          <div>
            <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Leave Requests ({leaveApprovals.length})
            </h4>
            {leaveApprovals.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                No pending leave requests
              </div>
            ) : (
              <div className="space-y-2">
                {leaveApprovals.slice(0, 3).map((a) => (
                  <ApprovalCard
                    key={a.id}
                    request={a}
                    onApprove={() => handleApprove(a.id)}
                    onReject={() => handleReject(a.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Regularization Requests */}
          <div>
            <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Regularization ({regularizationApprovals.length})
            </h4>
            {regularizationApprovals.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                No pending regularization requests
              </div>
            ) : (
              <div className="space-y-2">
                {regularizationApprovals.slice(0, 3).map((a) => (
                  <ApprovalCard
                    key={a.id}
                    request={a}
                    onApprove={() => handleApprove(a.id)}
                    onReject={() => handleReject(a.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Overtime Requests */}
          <div>
            <h4 className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Overtime ({overtimeApprovals.length})
            </h4>
            {overtimeApprovals.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                No pending overtime requests
              </div>
            ) : (
              <div className="space-y-2">
                {overtimeApprovals.slice(0, 3).map((a) => (
                  <ApprovalCard
                    key={a.id}
                    request={a}
                    onApprove={() => handleApprove(a.id)}
                    onReject={() => handleReject(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {pendingApprovals.length > 3 && (
          <div className="text-center">
            <Button variant="outline" className="text-xs font-bold border-primary/30 text-primary hover:bg-primary/10">
              View All {pendingApprovals.length} Pending Approvals →
            </Button>
          </div>
        )}
      </DashboardSection>

      {/* ═══ Team Daily Roster ═══ */}
      <DashboardSection
        title="Team Daily Roster"
        subtitle="Today&apos;s attendance and punch status for your direct reports"
        icon={<Users className="h-5 w-5 text-emerald-500" />}
      >
        {teamMembers.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No team members assigned yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold">Punch In</th>
                  <th className="pb-3 font-semibold">Punch Out</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Employee Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-slate-800 dark:text-slate-200">
                {teamMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {m.name}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {m.email}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {m.department}
                    </td>
                    <td className="py-3 font-mono text-[11px]">
                      {m.punchInTime
                        ? new Date(m.punchInTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 font-mono text-[11px]">
                      {m.punchOutTime
                        ? new Date(m.punchOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : m.punchInTime ? "Active" : "—"}
                    </td>
                    <td className="py-3">
                      <AttendanceChip status={m.attendanceStatus || "ABSENT"} />
                    </td>
                    <td className="py-3 font-mono font-bold text-primary text-[11px]">
                      {m.employeeCode || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      {/* ═══ Quick Links ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickLink
          href="/hrms/manager/projects"
          icon={<Briefcase className="h-5 w-5 text-primary" />}
          label="Project Tasks"
          desc="Delegate & monitor team tasks"
        />
        <QuickLink
          href="/hrms/manager/timesheets"
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          label="Timesheet Review"
          desc="Review & lock team hours"
        />
        <QuickLink
          href="/hrms/manager/approvals"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Approvals"
          desc="Leave, regularization & overtime"
        />
        <QuickLink
          href="/hrms/manager/analytics"
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          label="KPI Analytics"
          desc="Team performance metrics"
        />
      </div>
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </span>
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
        {value}
      </p>
      <span className={`text-[11px] ${accent} flex items-center gap-1 mt-1 font-semibold`}>
        {label}
      </span>
    </div>
  );
}

function DashboardSection({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
            {icon} {title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: LeaveRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
      <div>
        <span className="font-bold text-slate-900 dark:text-white block">
          {request.employeeName}
        </span>
        <span className="text-slate-500 text-[10px]">
          {request.type}
          {request.isHalfDay && ` (Half: ${request.halfDaySlot === "first_half" ? "1st Half" : "2nd Half"})`}
          {" · "}
          {request.totalDays}d
          {" · "}
          {request.reason}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Button
          size="sm"
          onClick={onApprove}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-6 px-2"
        >
          <CheckCircle2 className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={onReject}
          className="text-[10px] font-bold h-6 px-2"
        >
          <XCircle className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function AttendanceChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PRESENT: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "PRESENT" },
    LATE: { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400", label: "LATE" },
    ABSENT: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-600 dark:text-red-400", label: "ABSENT" },
    WFH: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "WFH" },
    wfh: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", label: "WFH" },
    HALF_DAY: { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-600 dark:text-orange-400", label: "HALF DAY" },
  };
  const s = map[status] || map.ABSENT;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function QuickLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white hover:border-primary/50 transition-colors group"
    >
      <div className="mb-3">{icon}</div>
      <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{label}</h4>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
    </a>
  );
}
