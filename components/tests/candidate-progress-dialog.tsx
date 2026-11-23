"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Loader2,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type {
  TestDefinition,
  CandidateProgressItem,
} from "@/services/hrm/tests/types";

interface CandidateProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testItem: TestDefinition | null;
  onRetakeGranted?: () => void;
}

export function CandidateProgressDialog({
  open,
  onOpenChange,
  testItem,
  onRetakeGranted,
}: CandidateProgressDialogProps) {
  const toast = useToast();
  const [candidates, setCandidates] = useState<CandidateProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !testItem) {
      setCandidates([]);
      return;
    }

    let isMounted = true;
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hrm/v2/tests/${testItem.id}/candidates`);
        const data = await res.json();
        if (isMounted && data.success) {
          setCandidates(data.data || []);
        }
      } catch {
        toast.error("Failed to load candidate progress");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCandidates();
    return () => {
      isMounted = false;
    };
  }, [open, testItem, toast]);

  const handleGrantRetake = async (userId: string, userName: string) => {
    if (!testItem) return;
    setGrantingUserId(userId);
    try {
      const res = await fetch(`/api/hrm/v2/tests/${testItem.id}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant_retake", userId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Granted 1 extra attempt to ${userName}`);
        // Refresh local list
        const refreshedRes = await fetch(`/api/hrm/v2/tests/${testItem.id}/candidates`);
        const refreshedData = await refreshedRes.json();
        if (refreshedData.success) {
          setCandidates(refreshedData.data || []);
        }
        onRetakeGranted?.();
      } else {
        toast.error(data.error || "Failed to grant extra retake");
      }
    } catch {
      toast.error("Network error while granting attempt");
    } finally {
      setGrantingUserId(null);
    }
  };

  const totalAssigned = candidates.length;
  const totalCompleted = candidates.filter((c) => c.status === "evaluated").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {testItem && (
        <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                Candidate Progress & Retakes
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Assessment:{" "}
                <span className="font-semibold text-foreground">{testItem.title}</span> • Default
                Attempts: {testItem.maxAttempts || 1}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            View detailed test attempts and grant additional retakes to targeted employees.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
            <div className="flex items-center gap-4">
              <span>
                Assigned: <strong className="text-foreground">{totalAssigned}</strong>
              </span>
              <span>
                Completed:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {totalCompleted}
                </strong>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Highest achieved score is saved on the scorecard
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <span className="text-xs text-muted-foreground">Loading candidate roster...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-10 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs space-y-1">
              <p className="font-semibold text-foreground">No targeted candidates found</p>
              <p className="text-[11px]">
                This assessment may be scoped to all departments or has no assigned users yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {candidates.map((c) => {
                const isGranting = grantingUserId === c.userId;

                return (
                  <div
                    key={c.userId}
                    className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition-colors hover:border-border"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">{c.name}</span>
                        <span className="text-[11px] text-muted-foreground">({c.email})</span>
                        <Badge variant="outline" size="sm">
                          {c.department}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap">
                        <span>
                          Attempts:{" "}
                          <strong className="text-foreground">
                            {c.attemptsUsed} / {c.maxAttemptsAllowed}
                          </strong>
                        </span>

                        {c.bestScore !== undefined && (
                          <>
                            <span>•</span>
                            <span>
                              Best:{" "}
                              <strong className="text-foreground font-semibold">
                                {c.bestScore} / {c.maxScore} ({c.percentage}%)
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Badge
                        variant={
                          c.status === "evaluated"
                            ? c.passed
                              ? "success"
                              : "danger"
                            : c.status === "in_progress"
                            ? "info"
                            : c.status === "submitted"
                            ? "warning"
                            : "outline"
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {c.status === "evaluated"
                          ? c.passed
                            ? "Passed"
                            : "Failed"
                          : c.status.replace("_", " ")}
                      </Badge>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isGranting}
                        onClick={() => handleGrantRetake(c.userId, c.name)}
                        className="h-8 text-xs font-semibold gap-1.5"
                        title="Grant 1 additional attempt to this employee"
                      >
                        {isGranting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span>+1 Retake</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-border/80">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
      )}
    </Dialog>
  );
}
