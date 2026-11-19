"use client";

import { Clock, CheckCircle2, AlertTriangle, ShieldAlert, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ShiftPunctualityCardProps {
  shift: {
    schedule: string;
    officeStart: string;
    graceCutoff: string;
    officeEnd: string;
    isPunchedIn: boolean;
    isPunchedOut: boolean;
    punchInTime: string | null;
    punchOutTime: string | null;
    punctualityStatus: "on_time" | "grace" | "late" | "not_checked_in" | "half_day";
    lateMinutes: number;
    effectiveHours: number;
  };
  attendanceHealth: {
    daysPresent: number;
    lateMarksThisMonth: number;
    halfDaysThisMonth: number;
    maxAllowedLateMarks: number;
  };
}

export function ShiftPunctualityCard({
  shift,
  attendanceHealth,
}: ShiftPunctualityCardProps) {
  const lateMarks = attendanceHealth.lateMarksThisMonth;
  const maxLate = attendanceHealth.maxAllowedLateMarks || 3;
  const warningsLeft = Math.max(0, maxLate - lateMarks);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground leading-tight">
              Shift & Punctuality
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              Standard: 10:00 AM – 07:00 PM (Mon – Sat)
            </span>
          </div>
        </div>

        {/* Dynamic Punctuality Badge */}
        {shift.punctualityStatus === "on_time" && (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold gap-1">
            <CheckCircle2 className="w-3 h-3" /> On Time
          </Badge>
        )}
        {shift.punctualityStatus === "grace" && (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold gap-1">
            <AlertTriangle className="w-3 h-3" /> Grace Period
          </Badge>
        )}
        {shift.punctualityStatus === "late" && (
          <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
            <ShieldAlert className="w-3 h-3" /> Late Mark (+{shift.lateMinutes}m)
          </Badge>
        )}
        {shift.punctualityStatus === "not_checked_in" && (
          <Badge variant="outline" className="text-[10px] font-medium border-border/80">
            Awaiting Punch
          </Badge>
        )}
      </div>

      {/* Today Punch Timings */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground block font-medium">In Timestamp</span>
          <span className="font-mono font-bold text-sm text-foreground">
            {shift.punchInTime
              ? new Date(shift.punchInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "—"}
          </span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">Grace until 10:15 AM</span>
        </div>

        <div className="p-3 rounded-xl bg-muted/30 border border-border/60">
          <span className="text-[10px] text-muted-foreground block font-medium">Out Timestamp</span>
          <span className="font-mono font-bold text-sm text-foreground">
            {shift.punchOutTime
              ? new Date(shift.punchOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : shift.isPunchedIn
              ? "Active (Working)"
              : "—"}
          </span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">End at 07:00 PM</span>
        </div>
      </div>

      {/* Monthly Attendance Health Grid */}
      <div className="pt-3 border-t border-border/60">
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2">
          <span>Monthly Health</span>
          <span className={lateMarks >= maxLate ? "text-danger" : "text-emerald-600 dark:text-emerald-400"}>
            {warningsLeft > 0 ? `${warningsLeft} grace warnings left` : "Late mark penalty applied"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block font-mono">
              {attendanceHealth.daysPresent}
            </span>
            <span className="text-[10px] text-muted-foreground">Present</span>
          </div>

          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block font-mono">
              {lateMarks} / {maxLate}
            </span>
            <span className="text-[10px] text-muted-foreground">Late Marks</span>
          </div>

          <div className="p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
            <span className="text-sm font-extrabold text-sky-600 dark:text-sky-400 block font-mono">
              {attendanceHealth.halfDaysThisMonth}
            </span>
            <span className="text-[10px] text-muted-foreground">Half-Days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
