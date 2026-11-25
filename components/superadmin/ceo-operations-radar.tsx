"use client";

import { useState } from "react";
import {
  Users,
  Activity,
  Coffee,
  CalendarCheck,
  Building2,
  Home,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Radio,
} from "lucide-react";

export interface LiveEmployee {
  userId: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: string;
  reportingManager?: string | null;
  status: string; // punched_in | punched_out | absent
  auxState: string | null; // active | on_break | meeting | null
  punchInTime: string | null;
  punchOutTime: string | null;
  workLocation: "office" | "remote" | null;
  elapsedMins: number;
}

export interface OperationsRadarData {
  totalHeadcount: number;
  punchedIn: number;
  activeAux: number;
  onBreak: number;
  inMeeting: number;
  punchedOut: number;
  absent: number;
  inOffice: number;
  remote: number;
  liveEmployees: LiveEmployee[];
}

interface CeoOperationsRadarProps {
  data: OperationsRadarData;
}

export function CeoOperationsRadar({ data }: CeoOperationsRadarProps) {
  const [filter, setFilter] = useState<
    "all" | "punched_in" | "active" | "on_break" | "meeting" | "in_office" | "remote" | "absent"
  >("all");
  const [search, setSearch] = useState("");

  const formatMins = (mins: number) => {
    if (!mins || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const filteredEmployees = data.liveEmployees
    .filter((emp) => {
      if (filter === "punched_in") return emp.status === "punched_in";
      if (filter === "active") return emp.status === "punched_in" && emp.auxState === "active";
      if (filter === "on_break") return emp.status === "punched_in" && emp.auxState === "on_break";
      if (filter === "meeting") return emp.status === "punched_in" && emp.auxState === "meeting";
      if (filter === "in_office") return emp.status === "punched_in" && emp.workLocation === "office";
      if (filter === "remote") return emp.status === "punched_in" && emp.workLocation === "remote";
      if (filter === "absent") return emp.status === "absent";
      return true;
    })
    .filter((emp) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    });

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Organization Live Operations Radar
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                Live AUX Sync
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time work statuses, AUX states, and office vs remote split
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Metric Badges / Filter Chips */}
      <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-5 overflow-x-auto pb-1.5 scrollbar-none">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "all"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">Total</div>
          <div className="text-lg font-bold">{data.totalHeadcount}</div>
        </button>

        <button
          onClick={() => setFilter("punched_in")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "punched_in"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">On Duty</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {data.punchedIn}
          </div>
        </button>

        <button
          onClick={() => setFilter("active")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "active"
              ? "bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">Active AUX</div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {data.activeAux}
          </div>
        </button>

        <button
          onClick={() => setFilter("on_break")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "on_break"
              ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">On Break</div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.onBreak}
          </div>
        </button>

        <button
          onClick={() => setFilter("meeting")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "meeting"
              ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">In Meeting</div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {data.inMeeting}
          </div>
        </button>

        <button
          onClick={() => setFilter("in_office")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "in_office"
              ? "bg-teal-500/15 border-teal-500/40 text-teal-600 dark:text-teal-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">In Office</div>
          <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
            {data.inOffice}
          </div>
        </button>

        <button
          onClick={() => setFilter("remote")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "remote"
              ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">Remote</div>
          <div className="text-lg font-bold text-sky-600 dark:text-sky-400">
            {data.remote}
          </div>
        </button>

        <button
          onClick={() => setFilter("absent")}
          className={`shrink-0 min-w-[95px] sm:min-w-0 p-2.5 rounded-xl border text-left transition-all ${
            filter === "absent"
              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400"
              : "bg-muted/30 border-border/60 hover:bg-muted/50 text-foreground"
          }`}
        >
          <div className="text-[10px] font-medium text-muted-foreground uppercase">Absent</div>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {data.absent}
          </div>
        </button>
      </div>

      {/* Employee Live Cards */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            No employees matching &ldquo;{filter}&rdquo; filter.
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.userId}
              className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{emp.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {emp.employeeCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {emp.designation} &bull; {emp.department}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Location Badge */}
                {emp.workLocation && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      emp.workLocation === "office"
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    }`}
                  >
                    {emp.workLocation === "office" ? (
                      <Building2 className="h-3 w-3" />
                    ) : (
                      <Home className="h-3 w-3" />
                    )}
                    {emp.workLocation === "office" ? "Office" : "Remote"}
                  </span>
                )}

                {/* AUX Status Badge */}
                {emp.status === "punched_in" ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      emp.auxState === "on_break"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : emp.auxState === "meeting"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {emp.auxState === "on_break" ? (
                      <Coffee className="h-3 w-3" />
                    ) : emp.auxState === "meeting" ? (
                      <CalendarCheck className="h-3 w-3" />
                    ) : (
                      <Activity className="h-3 w-3" />
                    )}
                    {emp.auxState === "on_break"
                      ? "Break"
                      : emp.auxState === "meeting"
                      ? "Meeting"
                      : "Active"}
                  </span>
                ) : emp.status === "punched_out" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    <Clock className="h-3 w-3" />
                    Out
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <XCircle className="h-3 w-3" />
                    Absent
                  </span>
                )}

                {/* Elapsed Work Time */}
                {emp.status === "punched_in" && (
                  <span className="text-[11px] font-mono text-muted-foreground w-14 text-right">
                    {formatMins(emp.elapsedMins)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
