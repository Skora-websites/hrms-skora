"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { downloadFileFromUrl } from "@/lib/download";
import {
  FileText,
  Send,
  Download,
  Clock,
  CheckCircle2,
  Loader2,
  Copy,
} from "lucide-react";

interface OfferLetter {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  offerContent: string | null;
  createdAt: string;
  releasedAt: string | null;
  downloadedAt: string | null;
}

export default function EmployeeOfferLettersPage() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<OfferLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    loadLetters();
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/hrm/v2/offer-letters", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Offer letter request submitted! The CEO will review and release it." });
        await loadLetters();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to submit request" });
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
    }
    setRequesting(false);
  };

  const handleDownload = async (letter: OfferLetter) => {
    try {
      const { ok, headers } = await downloadFileFromUrl(
        "/api/hrm/v2/offer-letters/download?id=" + letter.id,
        "offer-letter-" + letter.employeeName.replace(/\s+/g, "-") + ".pdf"
      );
      if (ok) {
        const pw = headers.get("X-Offer-Letter-Password");
        if (pw) {
          setPassword(pw);
          setShowPwModal(true);
        }
        loadLetters();
      }
    } catch { /* empty */ }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const latest = letters.length > 0 ? letters[0] : null;

  return (
    <AppShell title="My Offer Letters">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Offer Letters</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Request and download your offer letter</p>
      </div>

      {msg && (
        <div className={"mb-4 p-3 rounded-xl text-xs font-semibold border " + (msg.type === "success" ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400")}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Request Section — always visible so users can (re-)request anytime */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Need a new or corrected offer letter?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Submit a request and the CEO will review and release it. If a request is already pending, we'll send a reminder.
                </p>
              </div>
              <Button onClick={handleRequest} disabled={requesting} className="bg-primary text-white font-bold px-5 py-2.5 shrink-0">
                {requesting ? "Submitting..." : latest ? "Request Another / Remind CEO" : "Generate Offer Letter"}
              </Button>
            </div>
          </div>

          {/* Current / Latest Letter */}
          {latest && (
            <div className={"rounded-2xl border p-6 " + (latest.status === "released" ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5" : "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5")}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {latest.status === "released" ? <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-0.5" /> : <Clock className="h-6 w-6 text-amber-500 mt-0.5" />}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Offer Letter</h3>
                    <p className={"text-xs font-semibold " + (latest.status === "released" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                      {latest.status === "released" ? "Released by CEO — Ready to Download" : "Pending CEO Review"}
                    </p>
                    {latest.salary && <p className="text-xs text-slate-500 mt-1">Annual Salary: ₹{latest.salary.toLocaleString("en-IN")}</p>}
                    {latest.joiningDate && <p className="text-xs text-slate-500">Joining: {latest.joiningDate}</p>}
                    {latest.department && <p className="text-xs text-slate-500">Department: {latest.department}</p>}
                    {latest.designation && <p className="text-xs text-slate-500">Designation: {latest.designation}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">Requested: {new Date(latest.createdAt).toLocaleDateString("en-IN")}</p>
                    {latest.releasedAt && <p className="text-[10px] text-slate-400">Released: {new Date(latest.releasedAt).toLocaleDateString("en-IN")}</p>}
                  </div>
                </div>
                {latest.status === "released" && (
                  <Button onClick={() => handleDownload(latest)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                    <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {letters.length > 1 && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">History</h3>
              <div className="space-y-2">
                {letters.slice(1).map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{l.employeeName}</span>
                      <span className="text-slate-500">{new Date(l.createdAt).toLocaleDateString("en-IN")} · {l.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (l.status === "released" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30")}>
                        {l.status === "released" ? "RELEASED" : l.status === "downloaded" ? "DOWNLOADED" : "PENDING"}
                      </span>
                      {l.status === "released" && (
                        <button onClick={() => handleDownload(l)} className="text-emerald-600 hover:text-emerald-700 font-bold">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              <button onClick={copyPassword} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copied && <p className="text-[10px] text-emerald-600 text-center mb-2">Copied!</p>}
            <p className="text-[10px] text-slate-400 text-center">This password protects your offer letter. Do not share it.</p>
            <button onClick={() => setShowPwModal(false)} className="w-full mt-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm">Got it</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
