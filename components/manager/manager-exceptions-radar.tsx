"use client";

import { AlertTriangle, MapPin, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExceptionsRadarProps {
  exceptions: {
    totalExceptions: number;
    lateMarks: Array<{ userId: string; name: string; employeeCode: string; lateCount: number; warning: string }>;
    driftExceptions: Array<{ userId: string; name: string; distance: number; punchInTime: string }>;
    unclosedPunches: Array<{ userId: string; date: string; name: string; punchInTime: string }>;
  };
}

export function ManagerExceptionsRadar({ exceptions }: ExceptionsRadarProps) {
  if (exceptions.totalExceptions === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
            Attendance Exception Radar ({exceptions.totalExceptions} items requiring attention)
          </h3>
        </div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px]">
          Action Needed
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* 1. Late Mark Threshold Warnings */}
        {exceptions.lateMarks.length > 0 && (
          <div className="p-3 rounded-xl bg-card border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Late-Mark Cap Breached ({exceptions.lateMarks.length})
            </span>
            <div className="space-y-1 mt-1">
              {exceptions.lateMarks.slice(0, 2).map((m, i) => (
                <div key={`${m.userId}-${i}`} className="flex justify-between text-[11px]">
                  <span className="font-semibold text-foreground truncate">{m.name}</span>
                  <span className="font-mono text-danger font-bold">{m.lateCount} late marks</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Grace allowance exhausted. Half-day deduction applies on next late punch.
            </p>
          </div>
        )}

        {/* 2. GPS Indoor Drift Exceptions */}
        {exceptions.driftExceptions.length > 0 && (
          <div className="p-3 rounded-xl bg-card border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> GPS Drift Verifications ({exceptions.driftExceptions.length})
            </span>
            <div className="space-y-1 mt-1">
              {exceptions.driftExceptions.slice(0, 2).map((d, i) => (
                <div key={`${d.userId}-${i}`} className="flex justify-between text-[11px]">
                  <span className="font-semibold text-foreground truncate">{d.name}</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{d.distance}m (Drift)</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Punched from 101m - 250m. Signed off as indoor structural drift.
            </p>
          </div>
        )}

        {/* 3. Unclosed Missing Punches */}
        {exceptions.unclosedPunches.length > 0 && (
          <div className="p-3 rounded-xl bg-card border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Unclosed Punches ({exceptions.unclosedPunches.length})
            </span>
            <div className="space-y-1 mt-1">
              {exceptions.unclosedPunches.slice(0, 2).map((u, i) => (
                <div key={`${u.userId}-${u.date}-${i}`} className="flex justify-between text-[11px]">
                  <span className="font-semibold text-foreground truncate">{u.name}</span>
                  <span className="font-mono text-muted-foreground">{u.date}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground pt-1">
              Missing clock-out record from previous shift. Regularization required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
