"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Eye,
  EyeOff,
  Building,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  ArrowUpRight,
} from "lucide-react";

interface FinancialBurnData {
  totalMonthlyGrossCommitment: number;
  employerEpfo: number;
  employerEsic: number;
  advancesDisbursed: number;
  pendingExpenses: number;
  totalProjectedBurn: number;
  activeEmployeeCount: number;
}

interface CeoFinancialBurnCardProps {
  data: FinancialBurnData;
}

export function CeoFinancialBurnCard({ data }: CeoFinancialBurnCardProps) {
  const [hideFigures, setHideFigures] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ceo-burn-privacy-mask");
      if (stored === "true") setHideFigures(true);
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const toggleHide = () => {
    const next = !hideFigures;
    setHideFigures(next);
    try {
      localStorage.setItem("ceo-burn-privacy-mask", String(next));
    } catch {
      // Ignore
    }
  };

  const formatCurrency = (val: number) => {
    if (hideFigures) return "₹ ••••••••";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const avgCostPerEmp = data.activeEmployeeCount > 0
    ? Math.round(data.totalProjectedBurn / data.activeEmployeeCount)
    : 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs text-card-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Monthly Fiscal Burn & Statutory Outflows
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3" />
                Statutory Verified
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live executive projection across wages, EPFO (13%), ESIC (3.25%), salary draws & claims
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={toggleHide}
            title={hideFigures ? "Reveal numbers" : "Mask numbers (Privacy Mode)"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {hideFigures ? (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Show Figures</span>
              </>
            ) : (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Hide (Privacy)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Burn Stat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Projected Outflow
              </span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight my-1">
              {formatCurrency(data.totalProjectedBurn)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Direct employer obligation for the current calendar cycle
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active Headcount:</span>
            <span className="font-bold text-foreground">{data.activeEmployeeCount} Staff</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-muted/40 border border-border/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Base Wage Commitments
              </span>
              <Building className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight my-1">
              {formatCurrency(data.totalMonthlyGrossCommitment)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total monthly gross compensation across all active employees
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg. Burn / Employee:</span>
            <span className="font-semibold text-foreground">
              {hideFigures ? "₹ •••••" : formatCurrency(avgCostPerEmp)}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-muted/40 border border-border/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Employer Statutory Liability
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight my-1">
              {formatCurrency(data.employerEpfo + data.employerEsic)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mandatory Indian employer match (EPFO 13% + ESIC 3.25%)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Statutory % of Gross:</span>
            <span className="font-semibold text-foreground">
              {data.totalMonthlyGrossCommitment > 0
                ? `${(((data.employerEpfo + data.employerEsic) / data.totalMonthlyGrossCommitment) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
        </div>
      </div>

      {/* Granular Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>EPFO Match (13%)</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground">
            {formatCurrency(data.employerEpfo)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            12% PF + 0.5% Admin + 0.5% EDLI
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>ESIC Match (3.25%)</span>
            <span className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground">
            {formatCurrency(data.employerEsic)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Gross &le; ₹21,000 threshold
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Salary Advances</span>
            <CreditCard className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground">
            {formatCurrency(data.advancesDisbursed)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Current month draws disbursed
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Pending Expenses</span>
            <Receipt className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-sm sm:text-base font-bold text-foreground">
            {formatCurrency(data.pendingExpenses)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Claims waiting for payout
          </p>
        </div>
      </div>
    </div>
  );
}
