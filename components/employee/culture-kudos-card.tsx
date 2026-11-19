"use client";

import { Sparkles, Calendar, Award, Gift, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface CultureKudosCardProps {
  culture: {
    kudosBudget: number;
    remainingPointsToGive: number;
    recentKudosReceived: any[];
  };
  upcomingHoliday: {
    name: string;
    date: string;
    daysRemaining: number;
  } | null;
}

export function CultureKudosCard({
  culture,
  upcomingHoliday,
}: CultureKudosCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground leading-tight">
                Culture & Kudos
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium">
                Peer Recognition & Allowance
              </span>
            </div>
          </div>

          <Link
            href="/hrms/engage/kudos"
            className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
          >
            Wall <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* 100 Point Monthly Budget Tracker */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between my-2">
          <div className="flex items-center gap-2.5">
            <Gift className="w-4 h-4 text-purple-500" />
            <div>
              <span className="text-[10px] text-muted-foreground block font-medium">
                Monthly Allowance
              </span>
              <span className="text-xs font-bold text-foreground">
                <span className="font-mono text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                  {culture.remainingPointsToGive}
                </span>{" "}
                / {culture.kudosBudget} pts left
              </span>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-600 dark:text-purple-400">
              Refreshes 1st of month
            </Badge>
          </div>
        </div>

        {/* Recent Kudos Received */}
        <div className="mt-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Recent Recognition
          </span>

          {culture.recentKudosReceived.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-border/70 text-center text-muted-foreground text-[11px]">
              No peer kudos received this month yet. Keep shining!
            </div>
          ) : (
            <div className="space-y-1.5">
              {culture.recentKudosReceived.slice(0, 2).map((k: any, i: number) => (
                <div
                  key={k.id || i}
                  className="p-2.5 rounded-xl bg-background border border-border/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate text-[11px]">
                        {k.badge || "Star"} from {k.senderName || "Colleague"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{k.message}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs shrink-0 ml-2">
                    +{k.points || 10} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Holiday Widget Banner */}
      {upcomingHoliday && (
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="font-semibold text-foreground block text-[11px]">
                {upcomingHoliday.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(upcomingHoliday.date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
            </div>
          </div>

          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            {upcomingHoliday.daysRemaining === 0
              ? "Today"
              : `In ${upcomingHoliday.daysRemaining} ${upcomingHoliday.daysRemaining === 1 ? "day" : "days"}`}
          </Badge>
        </div>
      )}
    </div>
  );
}
