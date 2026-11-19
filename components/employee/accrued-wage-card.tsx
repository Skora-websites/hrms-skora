"use client";

import { useState, useEffect } from "react";
import { DollarSign, Eye, EyeOff, TrendingUp, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccruedWageCardProps {
  accruedWage: number;
  currentAvailableAdvance: number;
  monthlyGross: number;
  onOpenAdvanceModal?: () => void;
  isVerified?: boolean;
}

export function AccruedWageCard({
  accruedWage,
  currentAvailableAdvance,
  monthlyGross,
  onOpenAdvanceModal,
  isVerified = true,
}: AccruedWageCardProps) {
  const [hideAmount, setHideAmount] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hrms_hide_finances");
      if (stored !== null) {
        setHideAmount(stored === "true");
      }
    } catch {}
  }, []);

  const toggleHide = () => {
    const next = !hideAmount;
    setHideAmount(next);
    try {
      localStorage.setItem("hrms_hide_finances", String(next));
    } catch {}
  };

  const percentage = monthlyGross > 0 ? Math.min(100, Math.round((accruedWage / monthlyGross) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block leading-tight">
              Earned Wage Access
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Real-time Accrual
            </span>
          </div>
        </div>

        <button
          onClick={toggleHide}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          title={hideAmount ? "Reveal figures" : "Mask figures for privacy"}
        >
          {hideAmount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Amount Display */}
      <div className="my-1">
        <p className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
          {hideAmount ? "₹ •••••" : `₹${accruedWage.toLocaleString()}`}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <span>Earned of</span>
          <span className="font-semibold text-foreground">
            {hideAmount ? "₹ •••••" : `₹${monthlyGross.toLocaleString()}`}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">
            ({percentage}%)
          </span>
        </p>
      </div>

      {/* Accrual Progress Bar */}
      <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden my-3">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Advance Eligibility & CTA */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block">Available Advance</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {hideAmount ? "₹ •••••" : `₹${currentAvailableAdvance.toLocaleString()}`}
          </span>
        </div>

        {onOpenAdvanceModal && isVerified && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenAdvanceModal}
            className="h-7 text-[11px] font-semibold rounded-lg hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
          >
            Advance <ArrowUpRight className="w-3 h-3 ml-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
