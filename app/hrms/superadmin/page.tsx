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
  ShieldCheck,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Activity,
  TrendingUp,
  AlertCircle,
  Briefcase,
  Search,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Loader2,
  XCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

// ── Types ──────────────────────────────────────────────────

interface Employee {
  _id?: string;
  id?: string;
  name?: string;
  displayName?: string;
  email: string;
  department?: string;
  designation?: string;
  status?: string;
  employeeCode?: string;
  role?: string;
  reportingManager?: string;
  joiningDate?: string;
  attendanceStatus?: string;
}

interface AttendanceRecord {
  _id: string;
  userId: string;           // MongoDB User ID
  userName: string;
  userEmail: string;
  employeeCode?: string;
  date: string;
  punchInTime?: string;     // ISO string from MongoDB
  punchOutTime?: string;    // ISO string from MongoDB
  location?: string;
  distanceMeters?: number;  // parsed from location string
  status?: string;
  workHours?: number;
  managerId?: string;
  overtimeHours?: number;
  regularizationStatus?: string;
}

interface EscalationRecord {
  id: string;
  employeeName: string;
  email: string;
  department: string;
  rejectionDate: string;
  deadlineHoursRemaining: number;
  status: string;
}

interface LiveStatusEmployee {
  userId: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: string;
  status: string; // punched_in | punched_out | absent
  auxState: string | null; // active | on_break | meeting | null
  punchInTime: string | null;
  punchOutTime: string | null;
  effectiveWorkMinutes: number;
  totalBreakMinutes: number;
  workHours: number;
  totalElapsedMinutes: number;
  currentLocation: any;
  auxSince: string | null;
  location: string | null;
  workLocation: "office" | "remote" | null;
  status_label: string;
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

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: "employee" | "manager";
}

interface Project {
  _id: string;
  name: string;
  status: string;
  progress?: number;
  members?: any[];
  budget?: number;
}

interface OfferLetter {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  offerContent: string | null;
  password?: string;
  createdAt: string;
  releasedAt: string | null;
}

interface OnboardingCandidate {
  id: string;
  userId: string;
  employeeName: string;
  email: string;
  department?: string;
  documentName?: string;
  documentUrl?: string;
  status: string;
  submittedAt: string;
}

interface UserRecord {
  id: string;
  displayName?: string;
  firstName?: string;
  email: string;
  role: string;
  status: string;
}

// ── Main Component ─────────────────────────────────────────

export default function SuperadminOverviewPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hrAdmins, setHrAdmins] = useState<UserRecord[]>([]);
  const [managers, setManagers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit/Delete modal state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserRecord | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });

  // Live Operations Dashboard
  const [liveEmployees, setLiveEmployees] = useState<LiveStatusEmployee[]>([]);
  const [liveSummary, setLiveSummary] = useState<LiveStatusSummary | null>(null);
  const [liveSearch, setLiveSearch] = useState("");
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [pendingOnboarding, setPendingOnboarding] = useState<OnboardingCandidate[]>([]);
  const [editingOffer, setEditingOffer] = useState<OfferLetter | null>(null);
  const [offerSalary, setOfferSalary] = useState("");
  const [offerJoinDate, setOfferJoinDate] = useState("");
  const [offerContentText, setOfferContentText] = useState("");
  const [liveFilter, setLiveFilter] = useState<"all" | "punched_in" | "in_office" | "remote" | "on_break" | "in_meeting" | "active" | "punched_out" | "absent">("all");

  useEffect(() => {
    loadData();

    // Auto-polling every 10 seconds for live updates
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    const handlePunchUpdate = () => {
      loadData(true);
    };
    window.addEventListener("attendance-updated", handlePunchUpdate);


  return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handlePunchUpdate);
    };
  }, []);

  const handleReleaseOffer = async (offer: OfferLetter) => {
    try {
      await fetch('/api/hrm/v2/offer-letters?id=' + offer.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'released',
          salary: offerSalary ? Number(offerSalary) : null,
          joiningDate: offerJoinDate || null,
          offerContent: offerContentText || null,
        }),
      });
      setEditingOffer(null);
      loadData(true);
    } catch (err) {
      console.error('Failed to release offer letter:', err);
    }
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {        const [empRes, attRes, escRes, leaveRes, projRes, hrRes, mgrRes, onbRes, offerRes, liveRes] =
        await Promise.allSettled([
          fetch("/api/hrm/v2/users?action=list").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/attendance").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/escalations").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/leaves?status=pending").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/projects").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/users?action=list&role=hr_admin").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/users?action=list&role=manager").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/onboarding?pending=true").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/offer-letters").then((r) => (r.ok ? r.json() : null)),
          fetch("/api/hrm/v2/attendance/live-status").then((r) => (r.ok ? r.json() : null)),
        ]);

      if (empRes.status === "fulfilled" && empRes.value) {
        const d = empRes.value.data;
        setEmployees(Array.isArray(d) ? d.filter((e: any) => {
        const r = (e.role || "").toLowerCase();
        return r !== "super_admin" && r !== "superadmin" && r !== "ceo";
      }) : []);
      }
      if (attRes.status === "fulfilled" && attRes.value) {
        const d = attRes.value.data;
        setAttendance(Array.isArray(d) ? d : []);
      }
      if (escRes.status === "fulfilled" && escRes.value) {
        const d = escRes.value.data;
        setEscalations(Array.isArray(d) ? d : []);
      }
      if (leaveRes.status === "fulfilled" && leaveRes.value) {
        const d = leaveRes.value.data;
        setLeaveRequests(Array.isArray(d) ? d : []);
      }
      if (projRes.status === "fulfilled" && projRes.value) {
        const d = projRes.value.data;
        setProjects(Array.isArray(d) ? d : []);
      }
      if (hrRes.status === "fulfilled" && hrRes.value) {
        const d = hrRes.value.data;
        setHrAdmins(Array.isArray(d) ? d : []);
      }
      if (mgrRes.status === "fulfilled" && mgrRes.value) {
        const d = mgrRes.value.data;
        setManagers(Array.isArray(d) ? d : []);
      }
      if (liveRes.status === "fulfilled" && liveRes.value) {
        setLiveEmployees(Array.isArray(liveRes.value.data) ? liveRes.value.data : []);
        if (liveRes.value.summary) setLiveSummary(liveRes.value.summary);
      }
      if (onbRes.status === "fulfilled" && onbRes.value) {
        setPendingOnboarding(Array.isArray(onbRes.value.data) ? onbRes.value.data : []);
      }
      if (offerRes.status === "fulfilled" && offerRes.value) {
        setOfferLetters(Array.isArray(offerRes.value.data) ? offerRes.value.data : []);
      }
    } catch {
      // use empty state
    }
    if (!isSilent) setLoading(false);
  };

  // ── Offer Letter & Onboarding Counts ──
  const pendingOfferCount = offerLetters.filter((o) => o.status === 'pending_ceo').length;
  const pendingOnbCount = pendingOnboarding.length;

  // ── Computed KPIs ──

  const totalEmployees = employees.length;
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = toLocalDateStr(new Date());
  const isSelectedToday = selectedAttendanceDate === todayStr;

  const todayAttendance = attendance.filter((a) => {
    const punchDate = a.date || (a.punchInTime ? new Date(a.punchInTime).toISOString().split("T")[0] : "");
    return punchDate === selectedAttendanceDate;
  });
  const presentCount = todayAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY" || a.status === "present" || a.status === "half_day" || a.status === "WFH" || a.status === "wfh"
  ).length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "in_progress"
  ).length;
  const overtimeHours = todayAttendance.reduce(
    (sum, a) => sum + (a.overtimeHours || 0),
    0
  );

  const filteredEmployees = searchQuery
    ? employees.filter(
        (e) =>
          (e.displayName || e.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : employees;

  // ── Handlers ──

  const handleEditUser = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      if (editRole && editRole !== editingUser.role) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            action: "role",
            role: editRole,
          }),
        });
      }
      if (editStatus && editStatus !== editingUser.status) {
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingUser.id,
            action: "status",
            status: editStatus,
          }),
        });
      }
      setSuccessMsg("User updated successfully");
      setEditingUser(null);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await fetch(`/api/hrm/v2/users?userId=${confirmDelete.id}`, {
        method: "DELETE",
      });
      setSuccessMsg("User deleted successfully");
      setConfirmDelete(null);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadData();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <AppShell title="CEO Command Center">
      {/* ── Success Toast ── */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">
            Command Center
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Welcome back, {user?.name || "CEO"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Full visibility across your organization — employees, attendance,
            projects, leaves, and escalations
          </p>
        </div>
        <Link
          href="/hrms/superadmin/settings"
          className="flex items-center space-x-2 bg-white dark:bg-[#0B0F19]/90 hover:bg-gray-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-white/10 font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors"
        >
          <Shield className="w-4 h-4 text-primary" />
          <span>Platform Settings</span>
        </Link>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Total Employees"
          value={totalEmployees}
          trend="+2 this month"
          trendUp
        />
        <KPICard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Present Today"
          value={presentCount}
          trend={`${todayAttendance.length > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0}% attendance`}
          trendUp
        />
        <KPICard
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          label="Absent Today"
          value={absentCount > 0 ? absentCount : 0}
          trend={absentCount > 0 ? "Needs attention" : "All here!"}
          trendUp={absentCount === 0}
        />
        <KPICard
          icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
          label="Pending Leaves"
          value={pendingLeaves.length}
          trend={
            pendingLeaves.length > 0
              ? `${pendingLeaves.filter((l) => l.requestedBy === "manager").length} from managers`
              : "All clear"
          }
          trendUp={pendingLeaves.length === 0}
        />
        <KPICard
          icon={<Briefcase className="h-5 w-5 text-blue-500" />}
          label="Active Projects"
          value={activeProjects}
          trend={`${projects.length} total`}
          trendUp
        />
        <KPICard
          icon={<Clock className="h-5 w-5 text-purple-500" />}
          label="Overtime Today"
          value={`${overtimeHours.toFixed(1)}h`}
          trend={overtimeHours > 0 ? "Approved hours" : "None logged"}
          trendUp
        />
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          href="/hrms/hr-admin/employees"
          icon={<Users className="h-5 w-5" />}
          label="Manage Employees"
          color="primary"
        />
        <QuickAction
          href="/hrms/hr-admin/onboarding"
          icon={<UserCheck className="h-5 w-5" />}
          label="Onboarding"
          color="emerald"
        />
        <QuickAction
          href="/hrms/hr-admin/payroll"
          icon={<DollarSign className="h-5 w-5" />}
          label="Run Payroll"
          color="blue"
        />
        <QuickAction
          href="/hrms/superadmin/audit-logs"
          icon={<FileText className="h-5 w-5" />}
          label="Audit Logs"
          color="orange"
        />
      </div>

      {/* ═══ LIVE OPERATIONS DASHBOARD ═══ */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Live Operations Dashboard</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Real-time AUX status · Effective hours · Punch times · Auto-refreshes every 10s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              {([
                ["all", "All"],
                ["punched_in", "Punched In"],
                ["in_office", "🏢 Office"],
                ["remote", "🏠 Remote"],
                ["on_break", "On Break"],
                ["in_meeting", "In Meeting"],
                ["active", "Active"],
                ["punched_out", "Punched Out"],
                ["absent", "Absent"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLiveFilter(key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                    liveFilter === key
                      ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={liveSearch}
                onChange={(e) => setLiveSearch(e.target.value)}
                className="w-32 pl-7 pr-2 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {liveSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{liveSummary.punchedIn}</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">Punched In</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{liveSummary.inOffice}</p>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">🏢 In Office</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{liveSummary.remote}</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">🏠 Remote</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{liveSummary.active}</p>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">Active</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{liveSummary.onBreak}</p>
              <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">On Break</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
              <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400">{liveSummary.inMeeting}</p>
              <p className="text-[10px] text-purple-500 dark:text-purple-400 font-medium">In Meeting</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <p className="text-lg font-extrabold text-slate-600 dark:text-slate-400">{liveSummary.punchedOut}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Punched Out</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
              <p className="text-lg font-extrabold text-red-600 dark:text-red-400">{liveSummary.absent}</p>
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium">Absent</p>
            </div>
          </div>
        )}

        {/* Live Employee Cards */}
        <div className="space-y-2">
          {liveEmployees
            .filter((emp) => {
              if (liveFilter === "punched_in") return emp.status === "punched_in";
              if (liveFilter === "in_office") return emp.status === "punched_in" && emp.workLocation === "office";
              if (liveFilter === "remote") return emp.status === "punched_in" && emp.workLocation === "remote";
              if (liveFilter === "on_break") return emp.status === "punched_in" && emp.auxState === "on_break";
              if (liveFilter === "in_meeting") return emp.status === "punched_in" && emp.auxState === "meeting";
              if (liveFilter === "active") return emp.status === "punched_in" && emp.auxState === "active";
              if (liveFilter === "punched_out") return emp.status === "punched_out";
              if (liveFilter === "absent") return emp.status === "absent";
              return true;
            })
            .filter((emp) => {
              if (!liveSearch) return true;
              const q = liveSearch.toLowerCase();
              return (
                emp.name.toLowerCase().includes(q) ||
                emp.email.toLowerCase().includes(q) ||
                emp.employeeCode.toLowerCase().includes(q) ||
                emp.department.toLowerCase().includes(q)
              );
            })
            .map((emp) => {
              const auxColor =
                emp.auxState === "on_break"
                  ? "amber"
                  : emp.auxState === "meeting"
                  ? "purple"
                  : "emerald";
              const auxLabel =
                emp.auxState === "on_break"
                  ? "On Break"
                  : emp.auxState === "meeting"
                  ? "In Meeting"
                  : emp.auxState === "active"
                  ? "Active"
                  : "—";
              const statusColor =
                emp.status === "punched_in"
                  ? "emerald"
                  : emp.status === "punched_out"
                  ? "slate"
                  : "red";

              return (
                <div
                  key={emp.userId}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                    emp.status === "punched_in"
                      ? "bg-white dark:bg-black/30 border-gray-100 dark:border-white/5 hover:shadow-md"
                      : emp.status === "punched_out"
                      ? "bg-slate-50 dark:bg-black/20 border-gray-100 dark:border-white/5 opacity-70"
                      : "bg-red-50/50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10"
                  }`}
                >
                  {/* Employee Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                      statusColor === "emerald" ? "bg-emerald-500" : statusColor === "slate" ? "bg-slate-400" : "bg-red-400"
                    }`}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{emp.name}</span>
                        <span className="font-mono text-[10px] text-primary font-bold">{emp.employeeCode}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {emp.department} · {emp.designation}
                      </div>
                    </div>
                  </div>

                  {/* Status & AUX */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {emp.status === "punched_in" && (
                      <>
                        {/* Work Location Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          emp.workLocation === "remote"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                        }`}>
                          {emp.workLocation === "remote" ? "🏠 Remote" : "🏢 Office"}
                        </span>

                        {/* AUX Badge */}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          auxColor === "amber"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                            : auxColor === "purple"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                        }`}>
                          {auxLabel}
                        </span>

                        {/* Effective Hours */}
                        <div className="text-center min-w-[70px]">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                            {Math.floor(emp.effectiveWorkMinutes / 60)}h {emp.effectiveWorkMinutes % 60}m
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">Work</p>
                        </div>

                        {/* Break */}
                        {emp.totalBreakMinutes > 0 && (
                          <div className="text-center min-w-[60px]">
                            <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                              {emp.totalBreakMinutes}m
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">Break</p>
                          </div>
                        )}

                        {/* Punch-in time */}
                        <div className="text-center min-w-[70px]">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {emp.punchInTime ? new Date(emp.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">Punch In</p>
                        </div>
                      </>
                    )}

                    {emp.status === "punched_out" && (
                      <>
                        <div className="text-center min-w-[70px]">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {emp.punchInTime ? new Date(emp.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">In</p>
                        </div>
                        <div className="text-center min-w-[70px]">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {emp.punchOutTime ? new Date(emp.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">Out</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30">
                          {emp.workHours}h logged
                        </span>
                      </>
                    )}

                    {emp.status === "absent" && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                        Not Punched In
                      </span>
                    )}
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

      {/* ═══ EMPLOYEE DIRECTORY ═══ */}
      <SectionCard
        title="Employee Directory"
        subtitle="All employees across the organization"
        icon={<Users className="h-5 w-5 text-primary" />}
        count={totalEmployees}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState message={loading ? "Loading employees..." : "No employees found. Add employees through the HR Admin dashboard."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Designation</th>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredEmployees.slice(0, 15).map((emp) => (
                  <tr
                    key={emp._id || emp.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {emp.displayName || emp.name}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {emp.email}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {emp.department || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {emp.designation || "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono font-bold text-primary text-[11px]">
                      {emp.employeeCode || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusChip status={emp.status || "active"} />
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {emp.reportingManager || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredEmployees.length > 15 && (
              <div className="text-center pt-3">
                <Link
                  href="/hrms/hr-admin/employees"
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  View all {filteredEmployees.length} employees →
                </Link>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ═══ ATTENDANCE OVERVIEW ═══ */}
      <SectionCard
        title={isSelectedToday ? "Today's Attendance Overview" : `Attendance Overview (${selectedAttendanceDate})`}
        subtitle={`${presentCount} Present · ${absentCount} Absent · ${totalEmployees} Total Employees`}
        icon={<MapPin className="h-5 w-5 text-indigo-500" />}
        count={todayAttendance.length}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setSelectedAttendanceDate(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  isSelectedToday
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);                   setSelectedAttendanceDate(toLocalDateStr(y));
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedAttendanceDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return toLocalDateStr(y); })()
                    ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Yesterday
              </button>
            </div>
            <input
              type="date"
              value={selectedAttendanceDate}
              onChange={(e) => setSelectedAttendanceDate(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-2.5 py-1 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer font-bold"
            />
            <Link
              href="/hrms/hr-admin/attendance"
              className="text-xs text-primary hover:underline font-semibold ml-1"
            >
              Master →
            </Link>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="pb-3 pr-4">Employee</th>
                <th className="pb-3 pr-4">Punch In</th>
                <th className="pb-3 pr-4">Punch Out</th>
                <th className="pb-3 pr-4">Geofence</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Overtime / Escalation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {todayAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      message={
                        loading
                          ? "Loading attendance data..."
                          : `No punch records found for ${selectedAttendanceDate}. Total ${absentCount} employees absent.`
                      }
                    />
                  </td>
                </tr>
              ) : (
                todayAttendance.map((rec, idx) => (
                  <tr
                    key={rec._id || `${rec.userId}-${rec.date}-${idx}`}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {rec.userName || "Unknown"}
                      </span>
                      {rec.employeeCode && (
                        <span className="ml-1.5 text-[10px] bg-gray-100 dark:bg-white/10 text-indigo-500 px-2 py-0.5 rounded font-mono">
                          {rec.employeeCode}
                        </span>
                      )}
                      {rec.userEmail && (
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {rec.userEmail}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {rec.punchInTime ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {new Date(rec.punchInTime).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {rec.punchOutTime ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {new Date(rec.punchOutTime).toLocaleTimeString()}
                        </span>
                      ) : rec.punchInTime ? (
                        <span className="text-yellow-500 text-[10px] font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[10px] font-mono">
                      {rec.distanceMeters !== undefined ? (
                        <span
                          className={
                            rec.distanceMeters <= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {rec.distanceMeters}m
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <AttendanceStatusBadge status={rec.status} />
                    </td>
                    <td className="py-3">
                      {rec.regularizationStatus === "PENDING" ? (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          Pending Regularization
                        </span>
                      ) : rec.overtimeHours && rec.overtimeHours > 0 ? (
                        <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          {rec.overtimeHours}h OT
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">
                          Standard
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ═══ TWO-COLUMN: LEAVE REQUESTS + HR/MANAGER ROSTER ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Requests */}
        <SectionCard
          title="Pending Leave Requests"
          subtitle="Approve or reject employee and manager leaves"
          icon={<CalendarDays className="h-5 w-5 text-orange-500" />}
          count={pendingLeaves.length}
        >
          {pendingLeaves.length === 0 ? (
            <EmptyState message="No pending leave requests. All clear!" />
          ) : (
            <div className="space-y-2">
              {pendingLeaves.slice(0, 8).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      {l.employeeName}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {l.type} · {l.totalDays}d · {l.reason}
                    </span>
                    {l.requestedBy === "manager" && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">
                        MANAGER REQUEST
                      </span>
                    )}
                  </div>
                  <Link
                    href="/hrms/hr-admin"
                    className="shrink-0 ml-2 text-primary text-[10px] font-bold hover:underline"
                  >
                    Review →
                  </Link>
                </div>
              ))}
              {pendingLeaves.length > 8 && (
                <div className="text-center pt-1">
                  <Link
                    href="/hrms/hr-admin"
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    View all {pendingLeaves.length} requests →
                  </Link>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* HR Admin & Manager Roster */}
        <SectionCard
          title="HR Admin & Manager Roster"
          subtitle="Assigned HR administrator and management team"
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          count={hrAdmins.length + managers.length}
        >
          <div className="space-y-4">
            {/* HR Admins */}
            <div>
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                HR Administrator
              </h4>
              {hrAdmins.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                  No HR Admin assigned yet
                </div>
              ) : (
                <div className="space-y-2">
                  {hrAdmins.map((u) => (
                    <RosterRow
                      key={u.id}
                      user={u}
                      onEdit={() => {
                        setEditingUser(u);
                        setEditRole(u.role);
                        setEditStatus(u.status);
                      }}
                      onDelete={() => setConfirmDelete(u)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Managers */}
            <div>
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                Managers
              </h4>
              {managers.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-400 text-[11px]">
                  No managers assigned yet
                </div>
              ) : (
                <div className="space-y-2">
                  {managers.map((u) => (
                    <RosterRow
                      key={u.id}
                      user={u}
                      onEdit={() => {
                        setEditingUser(u);
                        setEditRole(u.role);
                        setEditStatus(u.status);
                      }}
                      onDelete={() => setConfirmDelete(u)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ═══ PROJECT PROGRESS ═══ */}
      <SectionCard
        title="Active Projects"
        subtitle="Project progress and budget tracking"
        icon={<Briefcase className="h-5 w-5 text-blue-500" />}
        count={activeProjects}
      >
        {projects.length === 0 ? (
          <EmptyState message="No projects created yet. HR Admin can create projects from the HR Admin dashboard." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((p, idx) => (
              <div
                key={p._id || p.name || idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {p.name}
                  </span>
                  <ProjectStatusBadge status={p.status} />
                </div>
                {p.progress !== undefined && (
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-bold text-primary">
                        {p.progress}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {p.members && (
                  <p className="text-[10px] text-slate-500">
                    {p.members.length} member{p.members.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ═══ PENDING ONBOARDING APPLICATIONS ═══ */}
      <SectionCard
        title="Pending Onboarding Applications"
        subtitle="New employee registrations awaiting approval"
        icon={<UserCheck className="h-5 w-5 text-emerald-500" />}
        count={pendingOnbCount}
      >
        {pendingOnboarding.length === 0 ? (
          <EmptyState message="No pending onboarding applications." />
        ) : (
          <div className="space-y-2">
            {pendingOnboarding.map((c: any) => (
              <div key={c.id || c._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{c.employeeName || c.name}</span>
                  <span className="text-slate-500 text-[10px]">{c.email} {c.department ? "· " + c.department : ""}</span>
                  {c.documentName && (
                    <span className="text-[10px] text-primary block mt-1">
                      <FileText className="h-3 w-3 inline mr-1" />{c.documentName}
                    </span>
                  )}
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">PENDING</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ═══ PENDING OFFER LETTERS ═══ */}
      <SectionCard
        title="Offer Letter Requests"
        subtitle="Employees requesting offer letters — review and release"
        icon={<FileText className="h-5 w-5 text-blue-500" />}
        count={pendingOfferCount}
      >
        {offerLetters.length === 0 ? (
          <EmptyState message="No offer letter requests yet." />
        ) : (
          <div className="space-y-2">
            {offerLetters.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{offer.employeeName}</span>
                  <span className="text-slate-500 text-[10px]">{offer.employeeEmail} · {offer.department} · {offer.designation}</span>
                </div>
                <div className="flex items-center gap-2">
                  {offer.status === "released" ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">RELEASED</span>
                  ) : (
                    <button
                      onClick={() => { setEditingOffer(offer); setOfferSalary(offer.salary?.toString() || ""); setOfferJoinDate(offer.joiningDate || ""); setOfferContentText(offer.offerContent || ""); }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >Review & Release</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ═══ ONBOARDING ESCALATION QUEUE ═══ */}
      <SectionCard
        title="Onboarding Escalation Queue"
        subtitle="Employees who missed their 48-hour document re-upload deadline"
        icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
        count={escalations.length}
        variant="danger"
      >
        {escalations.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Onboarding Escalations
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              All document re-upload deadlines are currently compliant.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {escalations.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-red-200 dark:border-red-500/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {u.employeeName}
                  </h3>
                  <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                    48H DEADLINE EXPIRED
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {u.email} · {u.department}
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-gray-200 dark:border-white/5 text-[11px]">
                  <span className="text-slate-400 font-mono">
                    Escalated: {u.rejectionDate}
                  </span>
                  <Link
                    href="/hrms/hr-admin/onboarding"
                    className="text-primary font-bold hover:underline"
                  >
                    Resolve →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ═══ EDIT USER MODAL ═══ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg">Edit User Role & Status</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Editing: {editingUser.email}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="hr_admin">HR Admin</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="font-bold text-lg text-red-600 dark:text-red-400">
              Delete User
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete{" "}
              <strong>
                {confirmDelete.displayName || confirmDelete.email}
              </strong>
              ? This permanently deletes their account and record from the database.
            </p>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer Letter Review Modal */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingOffer(null)}>
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Review Offer Letter</h3>
              <button onClick={() => setEditingOffer(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{editingOffer.employeeName}</p>
                <p className="text-[10px] text-slate-500">{editingOffer.employeeEmail} · {editingOffer.department} · {editingOffer.designation}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Salary (₹)</label>
                <input type="number" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} placeholder="e.g. 500000" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                <input type="date" value={offerJoinDate} onChange={(e) => setOfferJoinDate(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Offer Letter Content</label>
                <textarea rows={8} value={offerContentText} onChange={(e) => setOfferContentText(e.target.value)} placeholder="Write the offer letter content here..." className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none" />
              </div>
              <button onClick={() => handleReleaseOffer(editingOffer)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Release Offer Letter</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  trend,
  trendUp,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-4 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
        {label}
      </p>
      <p
        className={`text-[10px] mt-1 font-semibold ${
          trendUp
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-orange-600 dark:text-orange-400"
        }`}
      >
        {trend}
      </p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 hover:border-primary/30 transition-colors group"
    >
      <div
        className={`p-2 rounded-lg border ${colors[color] || colors.primary}`}
      >
        {icon}
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
        {label}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 ml-auto group-hover:text-primary transition-colors" />
    </Link>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  count,
  variant,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number;
  variant?: "danger";
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white ${
        variant === "danger"
          ? "border-red-200 dark:border-red-500/20"
          : "border-gray-200 dark:border-white/10"
      }`}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              variant === "danger"
                ? "bg-red-500/10 border-red-500/20"
                : "bg-primary/10 border-primary/20"
            }`}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full font-bold">
            {count}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function RosterRow({
  user,
  onEdit,
  onDelete,
}: {
  user: UserRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
      <div className="min-w-0">
        <span className="font-bold text-slate-900 dark:text-white block truncate">
          {user.displayName || user.firstName || user.email}
        </span>
        <span className="text-[10px] text-slate-500 block truncate">
          {user.email}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            user.status === "active"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
          }`}
        >
          {user.status === "active" ? "Active" : "Disabled"}
        </span>
        <button
          onClick={onEdit}
          className="text-[10px] font-semibold text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/10"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] font-semibold text-red-500 hover:underline px-1.5 py-0.5 rounded hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const isActive = status === "active" || status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
        isActive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
      }`}
    >
      {isActive ? "Active" : status}
    </span>
  );
}

function AttendanceStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PRESENT: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      label: "PRESENT",
    },
    LATE: {
      bg: "bg-yellow-500/10 border-yellow-500/20",
      text: "text-yellow-600 dark:text-yellow-400",
      label: "LATE",
    },
    HALF_DAY: {
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      label: "HALF DAY",
    },
    ABSENT: {
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      label: "ABSENT",
    },
  };
  const s = map[status || ""] || map.ABSENT;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    completed: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    on_hold: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
        colors[status] || colors.active
      }`}
    >
      {status.replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-6 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
      {message}
    </div>
  );
}
