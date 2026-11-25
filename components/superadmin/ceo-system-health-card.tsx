"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Database,
  Lock,
  Activity,
  UserCheck,
  History,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Server,
} from "lucide-react";
import Link from "next/link";
import { MailStatusCard } from "./mail-status-card";

export interface AuditLogItem {
  id: string;
  action: string;
  performedByName: string;
  targetUserEmail: string;
  details: string;
  createdAt: string;
}

export interface SystemHealthData {
  engine: string;
  databaseStatus: "operational" | "degraded";
  pingLatencyMs: number;
  activeSessions: number;
  noMongoNotice: string;
  auditLogs: AuditLogItem[];
}

interface CeoSystemHealthCardProps {
  data: SystemHealthData;
}

export function CeoSystemHealthCard({ data }: CeoSystemHealthCardProps) {
  const [showMailStatus, setShowMailStatus] = useState(false);

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "update_role":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "update_status":
      case "login_disabled":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "reset_password":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "create_user":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs text-card-foreground">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  System Health & Security Audit Stream
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Pure MySQL
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Zero MongoDB &bull; Real-time connection ping & privileged action event logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMailStatus(!showMailStatus)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              {showMailStatus ? "Hide Mail Gateway" : "Inspect Mail Gateway"}
            </button>
            <Link
              href="/hrms/superadmin/audit-logs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors"
            >
              <span>Full Audit Logs</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Engine Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase">
                Database Engine
              </div>
              <div className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-primary" />
                <span>MySQL 8.0</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                mysql2 connection pool
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  data.databaseStatus === "operational"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                }`}
              >
                {data.databaseStatus === "operational" ? "Healthy" : "Degraded"}
              </span>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">
                {data.pingLatencyMs >= 0 ? `${data.pingLatencyMs}ms ping` : "—"}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase">
                Active Web Sessions
              </div>
              <div className="text-xl font-extrabold text-foreground mt-0.5 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-500" />
                <span>{data.activeSessions}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Active valid session tokens
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase">
                Database Isolation
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>100% Relational</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Zero NoSQL / Zero MongoDB
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Live Audit Stream */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Recent Privileged Security Events
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Last {data.auditLogs.length} Events
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {data.auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No recent security audit logs recorded.
              </div>
            ) : (
              data.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {log.performedByName}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-semibold border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      {log.targetUserEmail && (
                        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                          &rarr; {log.targetUserEmail}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {log.details || "Privileged system modification"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatTimestamp(log.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Conditionally Expanded Mail Status */}
      {showMailStatus && <MailStatusCard />}
    </div>
  );
}
