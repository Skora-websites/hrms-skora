"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

interface TransportInfo {
  provider: "smtp" | "resend";
  host: string | null;
  from: string;
}

interface LastTest {
  sent: boolean;
  to: string;
  provider: string;
  sentAt: string;
}

interface MailStatus {
  configured: boolean;
  transport: TransportInfo | null;
  autoEmailOnRelease: boolean;
  lastTestEmail: LastTest | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function MailStatusCard() {
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/email/test");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) setStatus(json.data);
      else setStatus({ configured: false, transport: null, autoEmailOnRelease: false, lastTestEmail: null });
    } catch {
      setStatus({ configured: false, transport: null, autoEmailOnRelease: false, lastTestEmail: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendTest = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/hrm/v2/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to.trim() ? { to: to.trim() } : {}),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.sent) {
        setResult({ ok: true, message: `Test email sent to ${json.data.to}` });
        setTo("");
      } else {
        setResult({ ok: false, message: json?.error || "Send failed — check server logs" });
      }
      await load();
    } catch (e: any) {
      setResult({ ok: false, message: e?.message || "Send failed" });
    } finally {
      setSending(false);
    }
  };

  const t = status?.transport;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Email / SMTP Status</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Offer letters, payslips and password resets all use this transport
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="self-start inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-primary transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && !status ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking mail configuration…
        </div>
      ) : !status?.configured || !t ? (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-semibold">
          No mail transport configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM
          in the environment, then redeploy.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Provider</span>
              <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                {t.provider === "smtp" ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Mail className="h-3.5 w-3.5 text-blue-500" />}
                {t.provider.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Server</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white break-all">{t.host || "resend-api"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">From</span>
              <span className="font-semibold text-slate-900 dark:text-white break-all">{t.from}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                status.autoEmailOnRelease
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {status.autoEmailOnRelease ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              Auto-email on release: {status.autoEmailOnRelease ? "ON" : "OFF"}
            </span>
            {status.lastTestEmail && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                  status.lastTestEmail.sent
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {status.lastTestEmail.sent ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                Last test: {status.lastTestEmail.sent ? "sent" : "failed"} to {status.lastTestEmail.to} ·{" "}
                {timeAgo(status.lastTestEmail.sentAt)}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Send to (blank = your own email)"
              className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={sendTest}
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white text-xs font-bold px-4 py-2 hover:bg-primary/90 disabled:opacity-50 shadow-md"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {sending ? "Sending…" : "Send Test Email"}
            </button>
          </div>

          {result && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border ${
                result.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}
            >
              {result.ok ? <CheckCircle2 className="inline h-4 w-4 mr-1" /> : <XCircle className="inline h-4 w-4 mr-1" />}
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
