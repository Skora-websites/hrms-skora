"use client";

import { useState } from "react";
import {
  CalendarDays,
  FileText,
  Clock,
  Receipt,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Search,
  CheckCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApprovalItem {
  id: string;
  category: "leave" | "regularization" | "overtime" | "expense";
  employeeId: string;
  employeeName: string;
  type: string;
  dates: string;
  days?: number;
  amount?: number;
  reason: string;
  createdAt: string;
  policyAlert?: string | null;
}

interface ApprovalHubProps {
  approvals: {
    totalPending: number;
    leaveCount: number;
    regularizationCount: number;
    overtimeCount: number;
    expenseCount: number;
    items: ApprovalItem[];
  };
  onRefresh: () => void;
}

export function ManagerApprovalHub({ approvals, onRefresh }: ApprovalHubProps) {
  const [activeTab, setActiveTab] = useState<"all" | "leave" | "regularization" | "overtime" | "expense">("all");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter items
  const filteredItems = approvals.items.filter((item) => {
    if (activeTab !== "all" && item.category !== activeTab) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.employeeName.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  // Approve single request
  const handleApprove = async (item: ApprovalItem) => {
    setActionLoadingId(item.id);
    try {
      if (item.category === "leave") {
        await fetch("/api/hrm/v2/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve", id: item.id }),
        });
      } else if (item.category === "regularization") {
        await fetch("/api/hrm/v2/attendance/regularization", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: "approved" }),
        });
      } else if (item.category === "overtime") {
        await fetch("/api/hrm/v2/attendance/overtime", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: "credited" }),
        });
      } else if (item.category === "expense") {
        await fetch("/api/hrm/v2/expenses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, action: "manager_approve" }),
        });
      }
      setFeedback({ type: "success", text: `Approved ${item.employeeName}'s ${item.type}.` });
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
    } catch {
      setFeedback({ type: "error", text: `Failed to approve ${item.type}.` });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject single request
  const handleReject = async (item: ApprovalItem) => {
    setActionLoadingId(item.id);
    try {
      if (item.category === "leave") {
        await fetch("/api/hrm/v2/leaves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", id: item.id, reason: "Manager rejected request" }),
        });
      } else if (item.category === "regularization") {
        await fetch("/api/hrm/v2/attendance/regularization", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: "rejected" }),
        });
      } else if (item.category === "overtime") {
        await fetch("/api/hrm/v2/attendance/overtime", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: "rejected" }),
        });
      } else if (item.category === "expense") {
        await fetch("/api/hrm/v2/expenses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, action: "reject", reason: "Manager rejected claim" }),
        });
      }
      setFeedback({ type: "success", text: `Rejected ${item.employeeName}'s ${item.type}.` });
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
    } catch {
      setFeedback({ type: "error", text: `Failed to reject ${item.type}.` });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Bulk Approve all visible
  const handleBulkApprove = async () => {
    if (filteredItems.length === 0) return;
    setBulkApproving(true);
    try {
      for (const item of filteredItems) {
        await handleApprove(item);
      }
      setFeedback({ type: "success", text: `Successfully approved all ${filteredItems.length} items.` });
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
    } catch {
      setFeedback({ type: "error", text: "Some items failed to approve in batch." });
    } finally {
      setBulkApproving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              4-in-1 Approval Center ({approvals.totalPending} Pending)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Review Leaves, Regularizations, Overtime, and Expense Reimbursements.
            </p>
          </div>
        </div>

        {filteredItems.length > 1 && (
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={bulkApproving}
            className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1 self-start sm:self-auto"
          >
            {bulkApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Approve All ({filteredItems.length})
          </Button>
        )}
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
          feedback.type === "success"
            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            : "bg-danger/10 text-danger border border-danger/20"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 overflow-x-auto">
          {[
            { id: "all", label: `All (${approvals.totalPending})` },
            { id: "leave", label: `Leaves (${approvals.leaveCount})` },
            { id: "regularization", label: `Regularizations (${approvals.regularizationCount})` },
            { id: "overtime", label: `Overtime (${approvals.overtimeCount})` },
            { id: "expense", label: `Expenses (${approvals.expenseCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-48"
          />
        </div>
      </div>

      {/* Approval List */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
          No pending approvals matching your selection. All caught up!
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isLoading = actionLoadingId === item.id;
            return (
              <div
                key={`${item.category}-${item.id}`}
                className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-border transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-xs">{item.employeeName}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.type}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.dates} {item.days ? `(${item.days} days)` : item.amount ? `(₹${item.amount.toLocaleString()})` : ""}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {item.reason}
                  </p>

                  {item.policyAlert && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{item.policyAlert}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => handleReject(item)}
                    className="h-8 text-xs text-danger hover:bg-danger/10 hover:text-danger rounded-xl"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleApprove(item)}
                    className="h-8 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                    Approve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
