"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Terminal,
  Server,
  CalendarCheck,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CronLog {
  id?: string;
  _id?: string;
  jobName: string;
  executedAt: string;
  status: "success" | "failed";
  recordsAffected: number;
  details: string;
}

export function CeoCronManagementConsole() {
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [history, setHistory] = useState<CronLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/hrm/v2/cron/run?status=history");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.history || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const triggerJob = async (jobName: string, force = false) => {
    setRunningJob(jobName);
    setFeedback(null);
    try {
      const res = await fetch(`/api/hrm/v2/cron/run?job=${jobName}${force ? "&force=true" : ""}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          text: `Job "${jobName}" completed successfully in ${json.durationMs}ms`,
        });
        await loadHistory();
      } else {
        setFeedback({
          type: "error",
          text: json.error || `Failed to run job "${jobName}"`,
        });
      }
    } catch (e: any) {
      setFeedback({
        type: "error",
        text: e.message || `Execution error on job "${jobName}"`,
      });
    } finally {
      setRunningJob(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const aaPanelTasks = [
    {
      id: "auto-punchout",
      name: "Shift Auto Punch-Out (Daily 19:30 & 23:59 IST)",
      schedule: "30 19 * * * and 59 23 * * *",
      curlCmd: `curl -s -X POST http://127.0.0.1:3000/api/hrm/v2/cron/run?job=auto-punchout -H "Authorization: Bearer skora-hrms-cron-secret-2026"`,
      shellCmd: `cd /www/wwwroot/hrms-skora && node scripts/cron-runner.js --job=auto-punchout`,
    },
    {
      id: "leave-accrual",
      name: "Monthly Leave Accrual (1st of month at 00:01 IST)",
      schedule: "1 0 1 * *",
      curlCmd: `curl -s -X POST http://127.0.0.1:3000/api/hrm/v2/cron/run?job=leave-accrual -H "Authorization: Bearer skora-hrms-cron-secret-2026"`,
      shellCmd: `cd /www/wwwroot/hrms-skora && node scripts/cron-runner.js --job=leave-accrual`,
    },
    {
      id: "late-deductions",
      name: "Late-Mark Punctuality Deductions (Monthly 28th-31st)",
      schedule: "0 23 28 * *",
      curlCmd: `curl -s -X POST http://127.0.0.1:3000/api/hrm/v2/cron/run?job=late-deductions -H "Authorization: Bearer skora-hrms-cron-secret-2026"`,
      shellCmd: `cd /www/wwwroot/hrms-skora && node scripts/cron-runner.js --job=late-deductions`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs text-card-foreground">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Automated Background Engine & aaPanel Crons
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  Production Ready
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Indian statutory automations: Shift auto-punchout, monthly leave credits, and punctuality penalty deductions
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loadingHistory}
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
            <span>Refresh History</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border mb-6 text-xs font-semibold flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Automated Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Job 1: Auto Punch-Out */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Clock className="h-3 w-3" />
                  19:30 & 23:59 IST
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Daily</span>
              </div>
              <h3 className="text-xs font-bold text-foreground">Shift Auto Punch-Out</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Closes unclosed shifts if employee is outside geofence at 19:30 IST. Caps work to 8h and raises pending Regularization.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <Button
                size="sm"
                variant="outline"
                disabled={runningJob !== null}
                onClick={() => triggerJob("auto-punchout")}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {runningJob === "auto-punchout" ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-primary" />
                )}
                <span>{runningJob === "auto-punchout" ? "Running..." : "Trigger Now"}</span>
              </Button>
            </div>
          </div>

          {/* Job 2: Monthly Leave Accrual */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CalendarDays className="h-3 w-3" />
                  1st of Month
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Monthly</span>
              </div>
              <h3 className="text-xs font-bold text-foreground">Monthly Leave Accrual</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Credits +1.5 days Casual Leave (CL) to all active employees. Enforces 18 days/year statutory ceiling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <Button
                size="sm"
                variant="outline"
                disabled={runningJob !== null}
                onClick={() => triggerJob("leave-accrual")}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {runningJob === "leave-accrual" ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span>{runningJob === "leave-accrual" ? "Running..." : "Trigger Now"}</span>
              </Button>
            </div>
          </div>

          {/* Job 3: Late Mark Deductions */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <CalendarCheck className="h-3 w-3" />
                  Payroll Cutoff
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Monthly</span>
              </div>
              <h3 className="text-xs font-bold text-foreground">Late-Mark Deductions</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Enforces Indian 3 late marks (&gt;10:15 AM) = 0.5-day deduction from CL (or LWP).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60">
              <Button
                size="sm"
                variant="outline"
                disabled={runningJob !== null}
                onClick={() => triggerJob("late-deductions")}
                className="w-full text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {runningJob === "late-deductions" ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-amber-500" />
                )}
                <span>{runningJob === "late-deductions" ? "Running..." : "Trigger Now"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* aaPanel Setup Guide */}
        <div className="p-4 rounded-xl border border-border/80 bg-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              aaPanel Cron Configuration Instructions
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">
            In your <strong>aaPanel Dashboard</strong> &rarr; <strong>Cron</strong> &rarr; Add Task (Type: <strong>Shell Script</strong> or <strong>URL-task</strong>).
          </p>

          <div className="space-y-3">
            {aaPanelTasks.map((t) => (
              <div key={t.id} className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-foreground">{t.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Cron: {t.schedule}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] font-mono text-muted-foreground bg-background p-1.5 rounded flex-1 truncate border border-border/40">
                    {t.curlCmd}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(t.curlCmd, t.id)}
                    className="text-xs shrink-0 h-7 px-2"
                  >
                    {copiedCmd === t.id ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-[11px]">Copy</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Recent Execution Audit Trail
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {history.length} Events Logged
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No automation executions recorded yet. Click &ldquo;Trigger Now&rdquo; above to run.
              </div>
            ) : (
              history.map((log, idx) => (
                <div
                  key={log.id || log._id || idx}
                  className="p-3 rounded-xl border border-border/60 bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">
                        {log.jobName}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-semibold border ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({log.recordsAffected} records affected)
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {log.details || "Execution complete"}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {formatTimestamp(log.executedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
