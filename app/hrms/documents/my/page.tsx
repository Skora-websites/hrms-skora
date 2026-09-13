"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import {
  FileText,
  DollarSign,
  Award,
  ShieldCheck,
  Download,
  Loader2,
  RefreshCw,
  Lock,
  FileX,
  ExternalLink,
} from "lucide-react";

interface MyDocument {
  id: string;
  category: "offer_letter" | "payslip" | "experience_letter" | "verification";
  title: string;
  subtitle: string;
  date: string;
  status: string;
  downloadable: boolean;
  downloadUrl: string | null;
  downloadLabel: string;
  note?: string;
}

const CATEGORY_META: Record<
  MyDocument["category"],
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  offer_letter: { label: "Offer Letters", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  payslip: { label: "Payslips", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  experience_letter: { label: "Experience Letters", icon: Award, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  verification: { label: "Verification Documents", icon: ShieldCheck, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
};

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (["released", "paid", "approved", "available"].includes(s)) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (["rejected"].includes(s)) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  if (s.includes("review") || s.includes("progress")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
};

export default function MyDocumentsPage() {
  const [docs, setDocs] = useState<MyDocument[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | MyDocument["category"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hrm/v2/documents/my");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Could not load your documents");
      setDocs(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Could not load your documents");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const list = docs || [];
    const filtered = filter === "all" ? list : list.filter((d) => d.category === filter);
    const byCategory: Record<string, MyDocument[]> = {};
    for (const d of filtered) {
      (byCategory[d.category] ||= []).push(d);
    }
    return byCategory;
  }, [docs, filter]);

  const counts = useMemo(() => {
    const list = docs || [];
    return {
      all: list.length,
      offer_letter: list.filter((d) => d.category === "offer_letter").length,
      payslip: list.filter((d) => d.category === "payslip").length,
      experience_letter: list.filter((d) => d.category === "experience_letter").length,
      verification: list.filter((d) => d.category === "verification").length,
    } as Record<string, number>;
  }, [docs]);

  return (
    <AppShell title="My Documents">
      <PageHeader
        title="My Documents"
        description="Every document HR has issued to you — offer letter, payslips, experience letter, and your verification uploads — in one place."
      >
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </PageHeader>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "offer_letter", "payslip", "experience_letter", "verification"] as const).map((cat) => {
          const meta = cat === "all" ? null : CATEGORY_META[cat];
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                active
                  ? "bg-primary text-white border-primary shadow-md"
                  : "bg-white dark:bg-black/40 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:border-primary/40"
              }`}
            >
              {meta ? <meta.icon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              {cat === "all" ? "All documents" : meta!.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? "bg-white/20" : "bg-slate-100 dark:bg-white/10"}`}>
                {counts[cat] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {loading && !docs ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your documents…
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400 font-semibold">
          {error}
        </div>
      ) : !docs || docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileX className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">No documents yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Once HR releases your offer letter, runs payroll, or completes your exit, those PDFs appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, list]) => {
            const meta = CATEGORY_META[category as MyDocument["category"]];
            const Icon = meta.icon;
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-8 w-8 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">{meta.label}</h2>
                  <span className="text-[10px] text-slate-400 font-bold">({list.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {list.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-xl ${meta.bg} ${meta.color} flex items-center justify-center shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{doc.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.subtitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusTone(doc.status)}`}>
                              {doc.status}
                            </span>
                            <span className="text-[10px] text-slate-400">{fmtDate(doc.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        {doc.downloadable && doc.downloadUrl ? (
                          <a
                            href={doc.downloadUrl}
                            download
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md transition-colors"
                          >
                            {doc.category === "offer_letter" ? <Lock className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                            {doc.downloadLabel}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold px-2">
                            <Loader2 className="h-3 w-3" />
                            {doc.note || "Not available yet"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {docs.some((d) => d.category === "offer_letter") && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ExternalLink className="h-3 w-3" />
              Offer-letter PDFs are password-protected; the password is included in the email HR sent you.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
