"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Building2,
  Home,
  Clock,
  Coffee,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface DirectReport {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  avatar?: string | null;
  status: "punched_in" | "punched_out" | "absent";
  auxState: string | null;
  workLocation: "office" | "remote" | null;
  punchInTime: string | null;
  punchOutTime: string | null;
  workHours: number;
  effectiveWorkMinutes: number;
  totalBreakMinutes: number;
  punctuality: "on_time" | "grace" | "late" | "absent";
  lateMinutes: number;
}

interface TeamOverview {
  totalTeam: number;
  punchedIn: number;
  active: number;
  onBreak: number;
  inMeeting: number;
  punchedOut: number;
  absent: number;
  inOffice: number;
  remote: number;
}

interface ManagerLiveRosterProps {
  directReports: DirectReport[];
  teamOverview: TeamOverview;
  onRefresh: () => void;
  loading?: boolean;
}

export function ManagerLiveRoster({
  directReports,
  teamOverview,
  onRefresh,
  loading = false,
}: ManagerLiveRosterProps) {
  const [filter, setFilter] = useState<
    "all" | "punched_in" | "active" | "on_break" | "in_meeting" | "punched_out" | "absent"
  >("all");
  const [search, setSearch] = useState("");

  const filteredReports = directReports
    .filter((emp) => {
      if (filter === "punched_in") return emp.status === "punched_in";
      if (filter === "active") return emp.status === "punched_in" && emp.auxState === "active";
      if (filter === "on_break") return emp.status === "punched_in" && emp.auxState === "on_break";
      if (filter === "in_meeting") return emp.status === "punched_in" && emp.auxState === "meeting";
      if (filter === "punched_out") return emp.status === "punched_out";
      if (filter === "absent") return emp.status === "absent";
      return true;
    })
    .filter((emp) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q)
      );
    });

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Team Live Roster & AUX Status ({teamOverview.totalTeam} Direct Reports)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Real-time attendance, active AUX states, and shift compliance.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Overview Stat Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-4">
        {[
          { label: "Punched In", val: teamOverview.punchedIn, color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" },
          { label: "Active", val: teamOverview.active, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "On Break", val: teamOverview.onBreak, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
          { label: "Meeting", val: teamOverview.inMeeting, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" },
          { label: "Office", val: teamOverview.inOffice, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Punched Out", val: teamOverview.punchedOut, color: "text-muted-foreground bg-muted/40 border-border/60" },
          { label: "Not Punched", val: teamOverview.absent, color: "text-danger bg-danger/10 border-danger/20" },
        ].map((s) => (
          <div key={s.label} className={`p-2.5 rounded-xl border text-center ${s.color}`}>
            <span className="font-extrabold text-base block font-mono leading-none">{s.val}</span>
            <span className="text-[10px] font-medium block mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "punched_in", label: "Punched In" },
            { id: "active", label: "Active" },
            { id: "on_break", label: "On Break" },
            { id: "in_meeting", label: "Meeting" },
            { id: "punched_out", label: "Punched Out" },
            { id: "absent", label: "Absent" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, ID, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
          />
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="space-y-2">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
            No team members match this filter.
          </div>
        ) : (
          filteredReports.map((emp) => {
            const initials = getInitials(emp.name);
            return (
              <div
                key={emp.id}
                className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 border border-border/80 shrink-0">
                    {emp.avatar ? (
                      <AvatarImage src={emp.avatar} alt={emp.name} />
                    ) : (
                      <AvatarFallback className="text-xs font-bold bg-primary text-white">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs truncate">{emp.name}</span>
                      <span className="font-mono text-[10px] text-primary font-bold">{emp.employeeCode}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {emp.designation} • {emp.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
                  {emp.status === "punched_in" && (
                    <>
                      {/* Location Badge */}
                      <Badge variant="outline" className="text-[10px] gap-1 font-semibold">
                        {emp.workLocation === "remote" ? <Home className="w-3 h-3 text-blue-500" /> : <Building2 className="w-3 h-3 text-emerald-500" />}
                        {emp.workLocation === "remote" ? "Remote" : "Office"}
                      </Badge>

                      {/* AUX Badge */}
                      <Badge
                        className={`text-[10px] capitalize font-semibold ${
                          emp.auxState === "on_break"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : emp.auxState === "meeting"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {emp.auxState?.replace("_", " ") || "Active"}
                      </Badge>

                      {/* Elapsed Hours */}
                      <div className="text-right">
                        <span className="font-mono font-bold text-foreground block leading-tight text-xs">
                          {Math.floor(emp.effectiveWorkMinutes / 60)}h {emp.effectiveWorkMinutes % 60}m
                        </span>
                        <span className="text-[9px] text-muted-foreground">Work Logged</span>
                      </div>

                      {/* In Time */}
                      <div className="text-right pl-2 border-l border-border/60">
                        <span className="font-mono text-foreground block leading-tight text-xs">
                          {emp.punchInTime ? new Date(emp.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">In Timestamp</span>
                      </div>
                    </>
                  )}

                  {emp.status === "punched_out" && (
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Punched Out ({emp.workHours}h logged)
                      </Badge>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Out: {emp.punchOutTime ? new Date(emp.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                  )}

                  {emp.status === "absent" && (
                    <Badge variant="outline" className="text-[10px] border-danger/30 text-danger bg-danger/5">
                      Not Punched In
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
