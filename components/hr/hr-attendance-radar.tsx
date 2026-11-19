"use client";

import { Clock, CheckCircle2, AlertTriangle, ShieldAlert, Building2, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface AttendanceRadarProps {
  radar: {
    shiftHours: string;
    punchedInToday: number;
    onTimeToday: number;
    gracePeriodToday: number;
    lateToday: number;
    absentToday: number;
    inOfficeCount: number;
    remoteCount: number;
    unclosedPreviousPunches: number;
  };
  totalEmployees: number;
}

export function HrAttendanceRadar({ radar, totalEmployees }: AttendanceRadarProps) {
  const compliancePct = totalEmployees > 0 ? Math.round((radar.punchedInToday / totalEmployees) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground leading-tight">
                Organization Shift Radar
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium">
                {radar.shiftHours}
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold">
            {compliancePct}% Present
          </Badge>
        </div>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-4 gap-2 my-2 text-center">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block leading-none">
              {radar.onTimeToday}
            </span>
            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 block mt-1">
              On-Time
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 font-mono block leading-none">
              {radar.gracePeriodToday}
            </span>
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 block mt-1">
              Grace
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20">
            <span className="text-base font-extrabold text-danger font-mono block leading-none">
              {radar.lateToday}
            </span>
            <span className="text-[10px] font-medium text-danger block mt-1">
              Late (&gt;10:15)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-base font-extrabold text-muted-foreground font-mono block leading-none">
              {radar.absentToday}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground block mt-1">
              Absent
            </span>
          </div>
        </div>

        {/* Location Split Bar */}
        <div className="p-2.5 rounded-xl bg-background border border-border/60 flex items-center justify-between text-xs my-3">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{radar.inOfficeCount} In-Office</span>
          </div>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
            <Home className="w-3.5 h-3.5" />
            <span>{radar.remoteCount} Remote</span>
          </div>
        </div>
      </div>

      {/* Footer Unclosed Punches Warning */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <ShieldAlert className={`w-3.5 h-3.5 ${radar.unclosedPreviousPunches > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          <span className="text-[11px] text-muted-foreground">
            {radar.unclosedPreviousPunches > 0
              ? `${radar.unclosedPreviousPunches} unclosed punches require auto-regularization`
              : "All previous shift logs reconciled"}
          </span>
        </div>

        <Link
          href="/hrms/hr-admin/attendance"
          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0"
        >
          Master <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
