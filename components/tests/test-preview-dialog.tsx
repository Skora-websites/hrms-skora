"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Clock,
  ShieldCheck,
  Loader2,
  Play,
  CheckCircle2,
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
import type { TestDefinition, TestQuestion } from "@/services/hrm/tests/types";

interface TestPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testItem: TestDefinition | null;
  isStaff: boolean;
  onLaunchInteractive: (testId: string) => void;
}

export function TestPreviewDialog({
  open,
  onOpenChange,
  testItem,
  isStaff,
  onLaunchInteractive,
}: TestPreviewDialogProps) {
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !testItem) {
      setQuestions([]);
      return;
    }

    let isMounted = true;
    const fetchFullTest = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hrm/v2/tests/${testItem.id}`);
        const data = await res.json();
        if (isMounted && data.success && data.data) {
          setQuestions(data.data.questions || []);
        }
      } catch {
        // Silently handle error
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullTest();
    return () => {
      isMounted = false;
    };
  }, [open, testItem]);

  if (!testItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {testItem.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {testItem.department || "General"}
                </Badge>
                <Badge
                  variant={testItem.status === "active" ? "success" : "secondary"}
                  size="sm"
                  className="capitalize"
                >
                  {testItem.status || "active"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Preview test metadata, questions, and proctoring parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block">Duration</span>
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {testItem.durationMinutes} mins
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block">Total Marks</span>
              <span className="font-semibold text-foreground">
                {testItem.totalMarks || 0} Marks
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block">Pass Benchmark</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {testItem.passPercentage}%
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block">Questions</span>
              <span className="font-semibold text-foreground">
                {questions.length || testItem.questionIds?.length || 0} Questions
              </span>
            </div>
          </div>

          {testItem.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {testItem.description}
            </p>
          )}

          {/* Anti-Cheating Proctoring */}
          <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Anti-Cheating Rules:
            </span>
            <span className="text-muted-foreground">
              Fullscreen: {testItem.proctoring?.requireFullscreen ? "Mandatory" : "Optional"} • Max
              Tab Switches: {testItem.proctoring?.maxViolationsAllowed ?? 3} • Auto-Submit on Expiry
            </span>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Questions Preview ({questions.length})
              </span>
              {isStaff && (
                <Badge variant="success" size="sm">
                  Evaluator Answer Keys Included
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                <span className="text-xs text-muted-foreground">Loading test questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/80 rounded-2xl text-muted-foreground text-xs">
                No questions linked to this assessment yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                        <Badge
                          variant={q.type === "MCQ" ? "info" : "warning"}
                          size="sm"
                        >
                          {q.type}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {q.topic}
                        </Badge>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                      </span>
                    </div>

                    <p className="font-medium text-foreground whitespace-pre-wrap leading-relaxed">
                      {q.text}
                    </p>

                    {q.type === "MCQ" && q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isCorrect = q.correctOptions?.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${
                                isCorrect && isStaff
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                  : "bg-muted/30 border-border/60 text-muted-foreground"
                              }`}
                            >
                              <span>{opt.text}</span>
                              {isCorrect && isStaff && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "DESCRIPTIVE" && q.referenceAnswer && isStaff && (
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-1">
                        <span className="font-semibold text-foreground">Model Answer: </span>
                        <p className="leading-relaxed">{q.referenceAnswer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/80">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close Preview
          </Button>

          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onLaunchInteractive(testItem.id);
            }}
            className="w-full sm:w-auto"
          >
            <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
            <span>
              {isStaff ? "Launch Simulator Preview" : "Start Assessment"}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
