"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  Search,
  Download,
  Copy,
} from "lucide-react";

interface OfferLetter {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  offerContent: string | null;
  password: string | null;
  createdAt: string;
  releasedAt: string | null;
  downloadedAt: string | null;
  emailSent?: boolean;
}

export default function SuperAdminOfferLettersPage() {
  const [letters, setLetters] = useState<OfferLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending_ceo" | "released">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingOffer, setEditingOffer] = useState<OfferLetter | null>(null);
  const [offerSalary, setOfferSalary] = useState("");
  const [offerJoinDate, setOfferJoinDate] = useState("");
  const [offerContentText, setOfferContentText] = useState("");
  const [search, setSearch] = useState("");
  const [bulkReleasing, setBulkReleasing] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrm/v2/offer-letters");
      if (res.ok) {
        const data = await res.json();
        setLetters(Array.isArray(data.data) ? data.data : []);
      }
    } catch { /* empty */ }
    setLoading(false);
  };

  const filtered = letters.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.employeeName.toLowerCase().includes(q) ||
        l.employeeEmail.toLowerCase().includes(q) ||
        l.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (pendingIds.every((id) => selected.has(id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingIds));
    }
  };

  const handleRelease = async (offer: OfferLetter) => {
    try {
      await fetch("/api/hrm/v2/offer-letters?id=" + offer.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "released",
          salary: offerSalary ? Number(offerSalary) : null,
          joiningDate: offerJoinDate || null,
          offerContent: offerContentText || null,
        }),
      });
      setEditingOffer(null);
      loadLetters();
    } catch { /* empty */ }
  };

  const handleBulkRelease = async () => {
    if (selected.size === 0) return;
    setBulkReleasing(true);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((id) =>
        fetch("/api/hrm/v2/offer-letters?id=" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "released" }),
        })
      )
    );
    setSelected(new Set());
    setBulkReleasing(false);
    loadLetters();
  };

  const handleDownload = async (offer: OfferLetter) => {
    try {
      const res = await fetch("/api/hrm/v2/offer-letters/download?id=" + offer.id);
      if (res.ok) {
        const pw = res.headers.get("X-Offer-Letter-Password");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "offer-letter-" + offer.employeeName.replace(/\s+/g, "-") + ".pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (pw) {
          setPassword(pw);
          setShowPwModal(true);
        }
        loadLetters();
      }
    } catch { /* empty */ }
  };

  const pendingIds = filtered.filter((l) => l.status === "pending_ceo").map((l) => l.id);
  const pendingCount = letters.filter((l) => l.status === "pending_ceo").length;
  const releasedCount = letters.filter((l) => l.status === "released").length;

  return (
    <AppShell title="Offer Letters">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Offer Letters</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review, release, and manage employee offer letters</p>
      </div>

      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {(["all", "pending_ceo", "released"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={"px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors " +
                (filter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white dark:bg-black/40 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-primary/50")}
            >
              {f === "all" ? `All (${letters.length})` : f === "pending_ceo" ? `Pending (${pendingCount})` : `Released (${releasedCount})`}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or department..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        {selected.size > 0 && (
          <Button onClick={handleBulkRelease} disabled={bulkReleasing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
            {bulkReleasing ? "Releasing..." : `Release Selected (${selected.size})`}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">No offer letters found.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/30">
            {pendingCount > 0 && (
              <button onClick={toggleSelectAll} className="text-xs text-primary font-bold hover:underline">
                {filtered.filter((l) => l.status === "pending_ceo").every((l) => selected.has(l.id)) ? "Deselect All" : "Select All Pending"}
              </button>
            )}
          </div>
          {/* List */}
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {filtered.map((offer) => (
              <div key={offer.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-black/20 transition-colors">
                {offer.status === "pending_ceo" && (
                  <input
                    type="checkbox"
                    checked={selected.has(offer.id)}
                    onChange={() => toggleSelect(offer.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{offer.employeeName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{offer.employeeEmail} · {offer.department} · {offer.designation}</p>
                  <p className="text-[10px] text-slate-400">Requested {new Date(offer.createdAt).toLocaleDateString("en-IN")}</p>
                {offer.status === "released" && (
                  <p className="text-[10px] font-semibold mt-0.5">
                    {offer.emailSent ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓ Emailed to employee</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Email not sent (auto-email off or not configured)</span>
                    )}
                  </p>
                )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {offer.salary && <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">₹{offer.salary.toLocaleString("en-IN")}</span>}
                  {offer.status === "released" ? (
                    <>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        RELEASED
                      </span>
                      <button
                        onClick={() => handleDownload(offer)}
                        title="Download PDF"
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingOffer(offer);
                        setOfferSalary(offer.salary?.toString() || "");
                        setOfferJoinDate(offer.joiningDate || "");
                        setOfferContentText(offer.offerContent || "");
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      Review & Release
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingOffer(null)}>
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Review Offer Letter</h3>
              <button onClick={() => setEditingOffer(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-black/30 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{editingOffer.employeeName}</p>
                <p className="text-[10px] text-slate-500">{editingOffer.employeeEmail} · {editingOffer.department} · {editingOffer.designation}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Salary (₹)</label>
                <input type="number" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} placeholder="e.g. 500000" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                <input type="date" value={offerJoinDate} onChange={(e) => setOfferJoinDate(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Offer Letter Content</label>
                <textarea rows={6} value={offerContentText} onChange={(e) => setOfferContentText(e.target.value)} placeholder="Write the offer letter content here..." className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none resize-none" />
              </div>
              <button onClick={() => handleRelease(editingOffer)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                Release Offer Letter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPwModal && password && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowPwModal(false)}>
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-slate-900 dark:text-white" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <FileText className="h-10 w-10 mx-auto text-blue-500 mb-3" />
              <h3 className="font-bold text-lg">Offer Letter Downloaded</h3>
              <p className="text-xs text-slate-500 mt-1">Use this password to open the PDF</p>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 mb-4">
              <span className="font-mono text-sm font-bold flex-1 text-center select-all">{password}</span>
              <button onClick={() => { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 text-center mb-3">Copied!</p>}
            <button onClick={() => setShowPwModal(false)} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl text-sm">Done</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
