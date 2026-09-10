"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Users,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Activity,
  Search,
  MapPin,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

interface TeamMember {
  _id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  employeeCode?: string;
  status?: string;
}

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

// ── Main Component ─────────────────────────────────────────

export default function ManagerMyTeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [liveData, setLiveData] = useState<LiveStatusEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<LiveStatusEmployee | null>(null);
  const [liveFilter, setLiveFilter] = useState<
    "all" | "punched_in" | "active" | "on_break" | "in_meeting" | "punched_out" | "absent"
  >("all");

  const isCeo = user?.role === "super_admin";
  const managerDept = isCeo ? null : (user?.department || null);

  const fetchTeam = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [teamRes, liveRes] = await Promise.allSettled([
        fetch("/api/hrm/v2/users?action=list").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/hrm/v2/attendance/live-status").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (teamRes.status === "fulfilled" && teamRes.value) {
        const allUsers = (teamRes.value.data || []) as any[];
        const team = allUsers.filter((u: any) => {
          const r = (u.role || "").toLowerCase();
          if (r !== "employee" && r !== "agent") return false;
          if (managerDept) {
            const dept = (u.department || "").toLowerCase();
            return dept === managerDept.toLowerCase();
          }
          return true;
        });
        setMembers(team);
      }

      if (liveRes.status === "fulfilled" && liveRes.value) {
        setLiveData(Array.isArray(liveRes.value.data) ? liveRes.value.data : []);
      }
    } catch (err: any) {
      if (!isSilent) setError(err.message || "Failed to load team");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [managerDept]);

  useEffect(() => {
    if (!user) return;
    fetchTeam();

    // Auto-poll every 10s
    const interval = setInterval(() => fetchTeam(true), 10000);
    const handlePunch = () => fetchTeam(true);
    window.addEventListener("attendance-updated", handlePunch);
    return () => {
      clearInterval(interval);
      window.removeEventListener("attendance-updated", handlePunch);
    };
  }, [user, fetchTeam]);

  // Merge team member data with live AUX data
  const mergedMembers = members.map((m) => {
    const live = liveData.find(
      (l) =>
        l.userId === m._id ||
        l.email.toLowerCase() === m.email.toLowerCase() ||
        l.employeeCode === m.employeeCode
    );
    return { ...m, live };
  });

  // Filter by search
  const filteredMembers = mergedMembers.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.displayName || "").toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.employeeCode || "").toLowerCase().includes(q) ||
      (m.designation || "").toLowerCase().includes(q)
    );
  });

  // Stats
  const totalMembers = filteredMembers.length;
  const liveMap = filteredMembers.reduce(
    (acc, m) => {
      const s = m.live?.status || "absent";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const punchedIn = liveMap["punched_in"] || 0;
  const onBreak = filteredMembers.filter((m) => m.live?.auxState === "on_break").length;
  const inMeeting = filteredMembers.filter((m) => m.live?.auxState === "meeting").length;

  return (
    <AppShell title="My Team Roster">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {managerDept ? `${managerDept} Team` : "Direct Reports"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time AUX status · Effective hours · Punch times · Auto-refreshes every 10s
          </p>
        </div>
        <button
          onClick={() => fetchTeam()}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryStat label="Total" value={totalMembers} color="slate" />
        <SummaryStat label="Punched In" value={punchedIn} color="emerald" />
        <SummaryStat label="On Break" value={onBreak} color="amber" />
        <SummaryStat label="In Meeting" value={inMeeting} color="purple" />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 mb-4">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
          {(
            [
              ["all", "All"],
              ["punched_in", "Punched In"],
              ["active", "Active"],
              ["on_break", "On Break"],
              ["in_meeting", "In Meeting"],
              ["punched_out", "Punched Out"],
              ["absent", "Absent"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setLiveFilter(k)}
              className={
                "px-2 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap " +
                (liveFilter === k
                  ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900")
              }
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 pl-7 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && members.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 backdrop-blur-md animate-pulse h-56"
            />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-12 text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-900 dark:text-white font-semibold text-lg">No team members found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Team members will appear here once employees are added.
          </p>
        </div>
      ) : (
        /* Team Cards with Live AUX */
        <div className="space-y-3">
          {filteredMembers.map((m) => {
            const live = m.live;
            const isOnline = live?.status === "punched_in";
            const isPunchedOut = live?.status === "punched_out";
            const isAbsent = !live || live.status === "absent";

            const auxLabel =
              live?.auxState === "on_break"
                ? "On Break"
                : live?.auxState === "meeting"
                ? "In Meeting"
                : live?.auxState === "active"
                ? "Active"
                : null;

            const auxCls =
              live?.auxState === "on_break"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                : live?.auxState === "meeting"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30";

            const initials = (m.displayName || m.firstName || "U")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={m._id}
                className={
                  "rounded-2xl border p-5 backdrop-blur-md transition-all " +
                  (isOnline
                    ? "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 shadow-sm dark:shadow-2xl hover:shadow-md"
                    : isPunchedOut
                    ? "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0B0F19]/70 opacity-70"
                    : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90")
                }
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <span className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                        {initials}
                      </span>
                      {/* Live indicator dot */}
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0B0F19] bg-emerald-500 shadow-sm" />
                      )}
                      {isPunchedOut && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0B0F19] bg-slate-400 shadow-sm" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {m.displayName || "Unknown"}
                      </h3>
                      <p className="text-[11px] text-primary font-medium">{m.designation || m.role}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="h-2.5 w-2.5" /> {m.email}
                      </p>
                    </div>
                  </div>

                  {/* Center: Live AUX Details */}
                  {isOnline && live && (
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Work Location */}
                      <span
                        className={
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border " +
                          (live.workLocation === "remote"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30")
                        }
                      >
                        {live.workLocation === "remote" ? "🏠 Remote" : "🏢 Office"}
                      </span>

                      {/* AUX Badge */}
                      {auxLabel && (
                        <span
                          className={
                            "px-2.5 py-1 rounded-full text-[10px] font-bold border " + auxCls
                          }
                        >
                          {auxLabel}
                        </span>
                      )}

                      {/* Effective Work Hours */}
                      <div className="text-center min-w-[70px]">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          {Math.floor(live.effectiveWorkMinutes / 60)}h{" "}
                          {live.effectiveWorkMinutes % 60}m
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Work</p>
                      </div>

                      {/* Break */}
                      {live.totalBreakMinutes > 0 && (
                        <div className="text-center min-w-[60px]">
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {live.totalBreakMinutes}m
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500">Break</p>
                        </div>
                      )}

                      {/* Punch In */}
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {live.punchInTime
                            ? new Date(live.punchInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Punch In</p>
                      </div>
                    </div>
                  )}

                  {/* Punched Out Status */}
                  {isPunchedOut && live && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {live.punchInTime
                            ? new Date(live.punchInTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">In</p>
                      </div>
                      <div className="text-center min-w-[70px]">
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {live.punchOutTime
                            ? new Date(live.punchOutTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500">Out</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30">
                        {live.workHours}h logged
                      </span>
                    </div>
                  )}

                  {/* Absent */}
                  {isAbsent && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                        Not Punched In
                      </span>
                    </div>
                  )}

                  {/* Right: Emp Code */}
                  <div className="shrink-0 text-right">
                    <span className="font-mono font-bold text-primary text-[11px]">
                      {m.employeeCode || "—"}
                    </span>
                    <span className="block text-[10px] text-slate-400">{m.department || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Employee Detail Modal ═══ */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{selectedEmployee.name}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedEmployee.designation} · {selectedEmployee.department}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-lg font-bold">&times;</button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono text-slate-500">{selectedEmployee.employeeCode}</span>
                <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (
                  selectedEmployee.status === "punched_in" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                  : selectedEmployee.status === "punched_out" ? "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30"
                  : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30"
                )}>
                  {selectedEmployee.status === "punched_in" ? "Punched In" : selectedEmployee.status === "punched_out" ? "Punched Out" : "Absent"}
                </span>
                {selectedEmployee.status === "punched_in" && selectedEmployee.auxState && (
                  <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (
                    selectedEmployee.auxState === "on_break" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                    : selectedEmployee.auxState === "meeting" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                  )}>
                    {selectedEmployee.auxState === "on_break" ? "On Break" : selectedEmployee.auxState === "meeting" ? "In Meeting" : "Active"}
                  </span>
                )}
                {selectedEmployee.status === "punched_in" && (
                  <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (
                    selectedEmployee.workLocation === "remote" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                  )}>
                    {selectedEmployee.workLocation === "remote" ? "🏠 Remote" : "🏢 Office"}
                  </span>
                )}
              </div>

              {/* Work Hours Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{Math.floor(selectedEmployee.effectiveWorkMinutes / 60)}h {selectedEmployee.effectiveWorkMinutes % 60}m</p>
                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">Effective Work</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{selectedEmployee.totalBreakMinutes}m</p>
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">Total Break</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{selectedEmployee.workHours}h</p>
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">Hours Logged</p>
                </div>
              </div>

              {/* Punch Times */}
              <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Punch Timeline</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1">Punch In</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {selectedEmployee.punchInTime ? new Date(selectedEmployee.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {selectedEmployee.punchInTime ? new Date(selectedEmployee.punchInTime).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-gray-200 dark:bg-white/10" />
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-500 mb-1">Punch Out</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {selectedEmployee.punchOutTime ? new Date(selectedEmployee.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Still Working"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {selectedEmployee.punchOutTime ? new Date(selectedEmployee.punchOutTime).toLocaleDateString() : ""}
                    </p>
                  </div>
                  {selectedEmployee.totalElapsedMinutes > 0 && (
                    <>
                      <div className="w-px h-10 bg-gray-200 dark:bg-white/10" />
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-500 mb-1">Total Elapsed</p>
                        <p className="text-sm font-bold text-primary font-mono">
                          {Math.floor(selectedEmployee.totalElapsedMinutes / 60)}h {selectedEmployee.totalElapsedMinutes % 60}m
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AUX Timeline */}
              {selectedEmployee.status === "punched_in" && (
                <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-3">Current AUX State</h4>
                  <div className="flex items-center gap-3">
                    <div className={"w-3 h-3 rounded-full " + (
                      selectedEmployee.auxState === "active" ? "bg-emerald-500 animate-pulse" :
                      selectedEmployee.auxState === "on_break" ? "bg-amber-500" :
                      selectedEmployee.auxState === "meeting" ? "bg-purple-500" : "bg-slate-400"
                    )} />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.auxState === "active" ? "Working (Active)" :
                       selectedEmployee.auxState === "on_break" ? "On Break" :
                       selectedEmployee.auxState === "meeting" ? "In Meeting" : "Unknown"}
                    </span>
                  </div>
                  {selectedEmployee.auxSince && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      Since: {new Date(selectedEmployee.auxSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}

// ── Sub-components ─────────────────────────────────────────

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const cls =
    color === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
      : color === "amber"
      ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
      : color === "purple"
      ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400"
      : "bg-slate-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-400";

  return (
    <div className={"text-center p-3 rounded-xl border " + cls}>
      <p className={"text-xl font-extrabold " + cls.split(" ").find((c) => c.startsWith("text-"))}>
        {value}
      </p>
      <p className={"text-[10px] font-medium " + cls.split(" ").find((c) => c.startsWith("text-"))}>
        {label}
      </p>
    </div>
  );
}
