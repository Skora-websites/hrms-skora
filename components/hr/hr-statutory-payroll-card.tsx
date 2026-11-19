"use client";

import { DollarSign, ShieldCheck, ArrowRight, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StatutoryPayrollProps {
  payroll: {
    currentPeriod: string;
    daysToPayrollCutoff: number;
    estimatedMonthlyGross: number;
    employerPfLiability: number;
    employerEsicLiability: number;
    projectedTdsWithholding: number;
    estimatedPtLiability: number;
    totalStatutoryLiabilities: number;
    pendingExpensePayoutTotal: number;
    pendingExpenseCount: number;
  };
}

export function HrStatutoryPayrollCard({ payroll }: StatutoryPayrollProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs text-card-foreground flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground leading-tight">
                Statutory Payroll & Compliance
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> EPFO · ESIC · Section 192 TDS · PT
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono">
            Cycle: {payroll.currentPeriod}
          </Badge>
        </div>

        {/* Primary Numbers */}
        <div className="grid grid-cols-2 gap-2 my-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground block font-medium">Estimated Gross Payout</span>
            <span className="text-lg font-extrabold text-foreground font-mono">
              ₹{payroll.estimatedMonthlyGross.toLocaleString()}
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">
              {payroll.daysToPayrollCutoff} days to cutoff
            </span>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground block font-medium">Statutory Liabilities</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              ₹{payroll.totalStatutoryLiabilities.toLocaleString()}
            </span>
            <span className="text-[9px] text-muted-foreground block mt-0.5">PF, ESIC & TDS</span>
          </div>
        </div>

        {/* Breakdown Chips */}
        <div className="grid grid-cols-3 gap-1.5 text-center my-3">
          <div className="p-1.5 rounded-lg bg-background border border-border/60">
            <span className="text-[9px] text-muted-foreground block">EPFO (13%)</span>
            <span className="text-xs font-mono font-bold text-foreground">
              ₹{payroll.employerPfLiability.toLocaleString()}
            </span>
          </div>

          <div className="p-1.5 rounded-lg bg-background border border-border/60">
            <span className="text-[9px] text-muted-foreground block">ESIC (3.25%)</span>
            <span className="text-xs font-mono font-bold text-foreground">
              ₹{payroll.employerEsicLiability.toLocaleString()}
            </span>
          </div>

          <div className="p-1.5 rounded-lg bg-background border border-border/60">
            <span className="text-[9px] text-muted-foreground block">Sec 192 TDS</span>
            <span className="text-xs font-mono font-bold text-foreground">
              ₹{payroll.projectedTdsWithholding.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block">Pending Reimbursements</span>
          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
            ₹{payroll.pendingExpensePayoutTotal.toLocaleString()} ({payroll.pendingExpenseCount} claims)
          </span>
        </div>

        <Link href="/hrms/hr-admin/payroll">
          <Button
            size="sm"
            className="h-7 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          >
            Run Payroll <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
