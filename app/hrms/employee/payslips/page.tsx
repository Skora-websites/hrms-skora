"use client";

import { useState, useEffect } from "react";
import { DollarSign, Download, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

interface Payslip {
  _id?: string;
  id?: string;
  month: string;
  year: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  earnings?: Record<string, number>;
  deductionsDetail?: Record<string, number>;
  status: string;
  generatedAt: string;
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/payroll/mypayslips");
      if (res.ok) setPayslips((await res.json()).data || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const handleDownloadPayslip = (p: Payslip) => {
    const lines = [
      `=====================================================`,
      `              OFFICIAL SALARY SLIP                   `,
      `=====================================================`,
      `Pay Period: ${p.month} ${p.year}`,
      `Generated Date: ${p.generatedAt ? new Date(p.generatedAt).toLocaleDateString() : new Date().toLocaleDateString()}`,
      `Payment Status: ${p.status}`,
      `-----------------------------------------------------`,
      `EARNINGS:`,
      ...Object.entries(p.earnings || { "Basic Salary": Math.round(p.grossPay * 0.6), "Allowances": Math.round(p.grossPay * 0.4) }).map(
        ([k, v]) => `  ${k.padEnd(30)}: INR ${v.toLocaleString()}`
      ),
      `TOTAL GROSS PAY                : INR ${p.grossPay.toLocaleString()}`,
      `-----------------------------------------------------`,
      `DEDUCTIONS:`,
      ...Object.entries(p.deductionsDetail || { "Provident Fund (PF)": Math.round(p.deductions * 0.7), "Income Tax (TDS)": Math.round(p.deductions * 0.3) }).map(
        ([k, v]) => `  ${k.padEnd(30)}: INR ${v.toLocaleString()}`
      ),
      `TOTAL DEDUCTIONS               : INR ${p.deductions.toLocaleString()}`,
      `-----------------------------------------------------`,
      `NET SALARY PAID                : INR ${p.netPay.toLocaleString()}`,
      `=====================================================`,
    ];

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payslip-${p.month}-${p.year}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalEarnings = payslips.reduce((s, p) => s + p.grossPay, 0);
  const totalDeductions = payslips.reduce((s, p) => s + p.deductions, 0);
  const totalNet = payslips.reduce((s, p) => s + p.netPay, 0);

  return (
    <AppShell title="My Payslips">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Payslips</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          View, audit and download your official monthly salary statements
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 text-center text-slate-900 dark:text-white backdrop-blur-md shadow-sm">
          <DollarSign className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{totalEarnings.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total Gross Earnings</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 text-center text-slate-900 dark:text-white backdrop-blur-md shadow-sm">
          <DollarSign className="h-5 w-5 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">₹{totalDeductions.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total Deductions (PF/Tax)</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-5 text-center text-slate-900 dark:text-white backdrop-blur-md shadow-sm">
          <DollarSign className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-extrabold text-primary">₹{totalNet.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Net Disbursed Pay</p>
        </div>
      </div>

      {/* Payslip List */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 text-slate-900 dark:text-white shadow-sm">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Salary Statement History ({payslips.length})
        </h3>
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading payslips from MongoDB...
          </div>
        ) : payslips.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl text-slate-500 dark:text-slate-400 text-xs">
            No payslips generated yet. Payslips are generated at the end of each month once payroll processing is executed by HR Admin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3 font-semibold">Pay Period</th>
                  <th className="pb-3 font-semibold">Gross Pay</th>
                  <th className="pb-3 font-semibold">Deductions</th>
                  <th className="pb-3 font-semibold">Net Pay</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {payslips.map((p, idx) => (
                  <tr key={p.id || p._id || idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3.5 font-bold">{p.month} {p.year}</td>
                    <td className="py-3.5 font-mono text-slate-700 dark:text-slate-300">₹{p.grossPay.toLocaleString()}</td>
                    <td className="py-3.5 font-mono text-red-600 dark:text-red-400">-₹{p.deductions.toLocaleString()}</td>
                    <td className="py-3.5 font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{p.netPay.toLocaleString()}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPayslip(p)}
                        className="text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10 h-8"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
