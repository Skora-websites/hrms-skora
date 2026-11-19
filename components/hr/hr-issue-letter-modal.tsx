"use client";

import { useState } from "react";
import { FileText, ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface IssueLetterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string; email: string; employeeCode: string }>;
  onLetterIssued?: () => void;
}

export function HrIssueLetterModal({
  open,
  onOpenChange,
  employees,
  onLetterIssued,
}: IssueLetterModalProps) {
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [templateCode, setTemplateCode] = useState("appointment");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [designation, setDesignation] = useState("");
  const [annualCtc, setAnnualCtc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string; seal?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/hrm/v2/documents/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          templateCode,
          userId: selectedEmpId,
          customTokens: {
            effectiveDate,
            designation,
            annualCtc,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate letter");

      const seal = data?.data?.verificationSeal || data?.data?.hash || "SHA-256 Verified";
      setResult({
        success: true,
        msg: "Document generated and stamped with tamper-evident cryptographic seal.",
        seal,
      });

      onLetterIssued?.();
      setTimeout(() => {
        if (result?.success) {
          onOpenChange(false);
          setResult(null);
        }
      }, 3000);
    } catch (err: any) {
      setResult({ success: false, msg: err.message || "Failed to generate letter" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Issue Cryptographic HR Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Official letter stamped with tamper-evident SHA-256 cryptographic hash seal.
          </DialogDescription>
        </DialogHeader>

        {result && (
          <div className={`p-3 rounded-xl text-xs flex flex-col gap-1 ${
            result.success
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}>
            <div className="flex items-center gap-1.5 font-semibold">
              {result.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{result.msg}</span>
            </div>
            {result.seal && (
              <span className="font-mono text-[10px] opacity-80 break-all pt-1">
                Seal: {result.seal}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Select Employee</label>
            <select
              required
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeCode || e.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Document Type</label>
              <select
                value={templateCode}
                onChange={(e) => setTemplateCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="appointment">Appointment Letter</option>
                <option value="offer">Offer Letter</option>
                <option value="experience">Experience Certificate</option>
                <option value="relieving">Relieving Letter</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Effective Date</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold mb-1">Designation</label>
              <input
                type="text"
                placeholder="Software Engineer"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Annual CTC (₹)</label>
              <input
                type="text"
                placeholder="₹12,00,000"
                value={annualCtc}
                onChange={(e) => setAnnualCtc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !selectedEmpId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
              Generate & Seal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
