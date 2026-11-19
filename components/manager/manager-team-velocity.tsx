"use client";

import { TrendingUp, Users, Award, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface TeamVelocityProps {
  velocity: {
    pending360ReviewsCount: number;
    probationApproachingCount: number;
    teamKpiCompletionRate: number;
  };
}

export function ManagerTeamVelocity({ velocity }: TeamVelocityProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground leading-tight">
              Team Velocity & Review Gates
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              360 Performance & Confirmation Checkpoints
            </span>
          </div>
        </div>

        <Link
          href="/hrms/performance"
          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
        >
          Calibration <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* 1. 360 Appraisal Evaluations */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              360 Appraisals
            </span>
            <p className="font-bold text-sm text-foreground">
              {velocity.pending360ReviewsCount} Pending Sign-off
            </p>
            <p className="text-[10px] text-muted-foreground">K-Anonymity & bias normalized</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-600 dark:text-sky-400">
            Cycle Q4
          </Badge>
        </div>

        {/* 2. Probation Approaching Confirmation */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              Probation Checkpoint
            </span>
            <p className="font-bold text-sm text-foreground">
              {velocity.probationApproachingCount} Due for Confirmation
            </p>
            <p className="text-[10px] text-muted-foreground">15-day notice transitioning to 60-day</p>
          </div>
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Lifecycle
          </Badge>
        </div>

        {/* 3. Team Goal Completion */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Sprint Goals / KPIs
            </span>
            <span className="font-mono font-bold text-primary text-xs">
              {velocity.teamKpiCompletionRate}%
            </span>
          </div>
          <Progress value={velocity.teamKpiCompletionRate} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground pt-0.5">
            On track across all engineering & operational deliverables
          </p>
        </div>
      </div>
    </div>
  );
}
