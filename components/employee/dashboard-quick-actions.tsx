"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Receipt,
  DollarSign,
  Clock,
  Sparkles,
  Lock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DashboardQuickActionsProps {
  isVerified: boolean;
  accrual: {
    accruedWage: number;
    currentAvailableAdvance: number;
    maxAdvanceAllowed: number;
  };
  onActionComplete: () => void;
}

export function DashboardQuickActions({
  isVerified,
  accrual,
  onActionComplete,
}: DashboardQuickActionsProps) {
  // Modal states
  const [leaveModal, setLeaveModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [regularizeModal, setRegularizeModal] = useState(false);
  const [kudosModal, setKudosModal] = useState(false);

  // Leave Form
  const [leaveType, setLeaveType] = useState("casual");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Advance Form
  const [advanceAmount, setAdvanceAmount] = useState<number>(
    Math.min(5000, Math.floor(accrual.currentAvailableAdvance))
  );
  const [advanceReason, setAdvanceReason] = useState("");
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [advanceMsg, setAdvanceMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Expense Form
  const [expenseCategory, setExpenseCategory] = useState("Travel");
  const [expenseAmount, setExpenseAmount] = useState<number | "">("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Regularize Form
  const [regDate, setRegDate] = useState("");
  const [regTime, setRegTime] = useState("10:00");
  const [regReason, setRegReason] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regMsg, setRegMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Kudos Form
  const [kudosEmail, setKudosEmail] = useState("");
  const [kudosPoints, setKudosPoints] = useState(10);
  const [kudosBadge, setKudosBadge] = useState("Innovator");
  const [kudosMessage, setKudosMessage] = useState("");
  const [kudosSubmitting, setKudosSubmitting] = useState(false);
  const [kudosMsg, setKudosMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Submit Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setLeaveMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: leaveType,
          startDate: leaveFrom,
          endDate: leaveTo,
          reason: leaveReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit leave application");
      setLeaveMsg({ type: "success", text: "Leave application submitted successfully!" });
      setTimeout(() => {
        setLeaveModal(false);
        setLeaveMsg(null);
        setLeaveReason("");
        onActionComplete();
      }, 1500);
    } catch (err: any) {
      setLeaveMsg({ type: "error", text: err.message || "Failed to apply" });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Submit Salary Advance
  const handleSalaryAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvanceSubmitting(true);
    setAdvanceMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/payroll/salary-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedAmount: Number(advanceAmount),
          reason: advanceReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit advance request");
      setAdvanceMsg({ type: "success", text: "Salary advance request routed for disbursement approval!" });
      setTimeout(() => {
        setAdvanceModal(false);
        setAdvanceMsg(null);
        setAdvanceReason("");
        onActionComplete();
      }, 1500);
    } catch (err: any) {
      setAdvanceMsg({ type: "error", text: err.message || "Failed to submit request" });
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  // Submit Expense
  const handleClaimExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseSubmitting(true);
    setExpenseMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expenseCategory,
          amount: Number(expenseAmount),
          description: expenseDesc,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit expense claim");
      setExpenseMsg({ type: "success", text: "Expense claim submitted for manager review!" });
      setTimeout(() => {
        setExpenseModal(false);
        setExpenseMsg(null);
        setExpenseDesc("");
        setExpenseAmount("");
        onActionComplete();
      }, 1500);
    } catch (err: any) {
      setExpenseMsg({ type: "error", text: err.message || "Failed to submit claim" });
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // Submit Regularize
  const handleRegularize = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/attendance/regularization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: regDate,
          punchInTime: `${regDate}T${regTime}:00`,
          reason: regReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit regularization");
      setRegMsg({ type: "success", text: "Regularization submitted for manager sign-off!" });
      setTimeout(() => {
        setRegularizeModal(false);
        setRegMsg(null);
        setRegReason("");
        onActionComplete();
      }, 1500);
    } catch (err: any) {
      setRegMsg({ type: "error", text: err.message || "Failed to submit request" });
    } finally {
      setRegSubmitting(false);
    }
  };

  // Submit Kudos
  const handleSendKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    setKudosSubmitting(true);
    setKudosMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/engage/kudos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverEmail: kudosEmail,
          points: Number(kudosPoints),
          badge: kudosBadge,
          message: kudosMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to give kudos");
      setKudosMsg({ type: "success", text: "Kudos sent successfully!" });
      setTimeout(() => {
        setKudosModal(false);
        setKudosMsg(null);
        setKudosMessage("");
        setKudosEmail("");
        onActionComplete();
      }, 1500);
    } catch (err: any) {
      setKudosMsg({ type: "error", text: err.message || "Failed to give kudos" });
    } finally {
      setKudosSubmitting(false);
    }
  };

  return (
    <>
      {/* ── Quick Action Pills Container ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {/* 1. Apply Leave */}
        <button
          onClick={() => isVerified && setLeaveModal(true)}
          disabled={!isVerified}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <CalendarDays className="w-4 h-4 text-primary" />
          <span>Apply Leave</span>
          {!isVerified && <Lock className="w-3 h-3 text-muted-foreground ml-0.5" />}
        </button>

        {/* 2. Salary Advance */}
        <button
          onClick={() => isVerified && setAdvanceModal(true)}
          disabled={!isVerified}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <span>Salary Advance</span>
          {!isVerified && <Lock className="w-3 h-3 text-muted-foreground ml-0.5" />}
        </button>

        {/* 3. Claim Expense */}
        <button
          onClick={() => isVerified && setExpenseModal(true)}
          disabled={!isVerified}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Receipt className="w-4 h-4 text-sky-500" />
          <span>Claim Expense</span>
          {!isVerified && <Lock className="w-3 h-3 text-muted-foreground ml-0.5" />}
        </button>

        {/* 4. Regularize Punch */}
        <button
          onClick={() => isVerified && setRegularizeModal(true)}
          disabled={!isVerified}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Clock className="w-4 h-4 text-amber-500" />
          <span>Regularize Punch</span>
          {!isVerified && <Lock className="w-3 h-3 text-muted-foreground ml-0.5" />}
        </button>

        {/* 5. Send Kudos */}
        <button
          onClick={() => setKudosModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs shrink-0"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>Send Kudos</span>
        </button>

        {/* 6. Support Ticket */}
        <Link
          href="/hrms/tickets"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition-all shadow-xs shrink-0"
        >
          <MessageSquare className="w-4 h-4 text-primary" />
          <span>Raise Ticket</span>
        </Link>
      </div>

      {/* ── Modal 1: Apply Leave ── */}
      <Dialog open={leaveModal} onOpenChange={setLeaveModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Apply for Leave
            </DialogTitle>
            <DialogDescription className="text-xs">
              Subject to Sandwich Policy (weekly offs adjacent to leaves count as leave).
            </DialogDescription>
          </DialogHeader>

          {leaveMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              leaveMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {leaveMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{leaveMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="casual">Casual Leave (CL)</option>
                <option value="sick">Sick Leave (SL)</option>
                <option value="earned">Earned / Privilege Leave (PL)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">From Date</label>
                <input
                  type="date"
                  required
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">To Date</label>
                <input
                  type="date"
                  required
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Reason</label>
              <textarea
                required
                rows={2}
                placeholder="Reason for leave request..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLeaveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={leaveSubmitting}>
                {leaveSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Submit Application
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: Salary Advance ── */}
      <Dialog open={advanceModal} onOpenChange={setAdvanceModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Request Salary Advance
            </DialogTitle>
            <DialogDescription className="text-xs">
              Earned Wage Access (EWA) allows drawing up to 50% of real-time accrued wage.
            </DialogDescription>
          </DialogHeader>

          {advanceMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              advanceMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {advanceMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{advanceMsg.text}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accrued Wage (To Date):</span>
              <span className="font-mono font-bold text-foreground">₹{accrual.accruedWage.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Eligible Limit (50%):</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ₹{accrual.currentAvailableAdvance.toLocaleString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleSalaryAdvance} className="space-y-3 text-xs mt-2">
            <div>
              <label className="block font-semibold mb-1">Requested Amount (₹)</label>
              <input
                type="number"
                required
                min={100}
                max={accrual.currentAvailableAdvance}
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Purpose / Reason</label>
              <textarea
                required
                rows={2}
                placeholder="Emergency medical, personal expense..."
                value={advanceReason}
                onChange={(e) => setAdvanceReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setAdvanceModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={advanceSubmitting || advanceAmount <= 0 || advanceAmount > accrual.currentAvailableAdvance}
              >
                {advanceSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Request Advance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 3: Claim Expense ── */}
      <Dialog open={expenseModal} onOpenChange={setExpenseModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-sky-500" /> Submit Expense Claim
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reimbursements require valid GST vouchers and manager sign-off.
            </DialogDescription>
          </DialogHeader>

          {expenseMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              expenseMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {expenseMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{expenseMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleClaimExpense} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Category</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Travel">Travel & Conveyance</option>
                <option value="Meals">Client & Team Meals</option>
                <option value="Office Supplies">Office Supplies & Stationery</option>
                <option value="Internet">Internet / Broadband Allowance</option>
                <option value="Training">Certifications & Training</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Claim Amount (₹)</label>
              <input
                type="number"
                required
                min={1}
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Expense Description</label>
              <textarea
                required
                rows={2}
                placeholder="Client meeting taxi fare, vendor receipt..."
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setExpenseModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={expenseSubmitting || !expenseAmount}>
                {expenseSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Submit Claim
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 4: Regularize Punch ── */}
      <Dialog open={regularizeModal} onOpenChange={setRegularizeModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Attendance Regularization
            </DialogTitle>
            <DialogDescription className="text-xs">
              Request correction for unclosed punches, field work, or biometric drift.
            </DialogDescription>
          </DialogHeader>

          {regMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              regMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {regMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{regMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleRegularize} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Incident Date</label>
                <input
                  type="date"
                  required
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Corrected Time</label>
                <input
                  type="time"
                  required
                  value={regTime}
                  onChange={(e) => setRegTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Reason / Client Reference</label>
              <textarea
                required
                rows={2}
                placeholder="Onsite client deployment, network connectivity glitch..."
                value={regReason}
                onChange={(e) => setRegReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRegularizeModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={regSubmitting}>
                {regSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Send to Manager
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal 5: Send Kudos ── */}
      <Dialog open={kudosModal} onOpenChange={setKudosModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" /> Send Peer Kudos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recognize peer teamwork, innovation, or excellence from your 100 pt monthly allowance.
            </DialogDescription>
          </DialogHeader>

          {kudosMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              kudosMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-danger/10 text-danger border border-danger/20"
            }`}>
              {kudosMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{kudosMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSendKudos} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Colleague Email</label>
              <input
                type="email"
                required
                placeholder="colleague@skora.in"
                value={kudosEmail}
                onChange={(e) => setKudosEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Points</label>
                <select
                  value={kudosPoints}
                  onChange={(e) => setKudosPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10 Points</option>
                  <option value={20}>20 Points</option>
                  <option value={50}>50 Points</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Badge</label>
                <select
                  value={kudosBadge}
                  onChange={(e) => setKudosBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Innovator">💡 Innovator</option>
                  <option value="Team Player">🤝 Team Player</option>
                  <option value="Problem Solver">🎯 Problem Solver</option>
                  <option value="Customer Champion">🌟 Customer First</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Appreciation Message</label>
              <textarea
                required
                rows={2}
                placeholder="Great job assisting with the database migration..."
                value={kudosMessage}
                onChange={(e) => setKudosMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setKudosModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={kudosSubmitting}
              >
                {kudosSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Send Recognition
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
