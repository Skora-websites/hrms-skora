"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

interface OfferLetter {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  designation: string;
  status: string;
  salary: number | null;
  joiningDate: string | null;
  createdAt: string;
  releasedAt: string | null;
  emailSent: boolean;
}

/**
 * Read-only offer-letter status page for employees.
 *
 * Delivery is email-only: when the CEO releases (or the onboarding approval
 * auto-releases) an offer letter, the password-protected PDF is emailed to
 * the employee's registered address with the password in the email body.
 * There is deliberately no download/request action here.
 */
export default function EmployeeOfferLettersPage() {
  const [letters, setLetters] = useState<OfferLetter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadLetters = async () => {
      try {
        const res = await fetch("/api/hrm/v2/offer-letters");
        if (res && res.ok) {
          const data = await res.json();
          if (!cancelled) setLetters(Array.isArray(data.data) ? data.data : []);
        }
      } catch { /* empty */ }
      if (!cancelled) setLoading(false);
    };
    loadLetters();
    return () => {
      cancelled = true;
    };
  }, []);

  const latest = letters.length > 0 ? letters[0] : null;

  return (
    <AppShell title="My Offer Letters">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Offer Letters</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Your offer letter is emailed to you as a password-protected PDF once the CEO releases it — no downloads here.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : (
        <div className="max-w-3xl space-y-6">
          {/* Email-only delivery notice */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">📩 Delivered by email only</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Your offer letter is sent to your registered email address when the CEO releases it. The PDF opens with the
              password stated in the same email — keep that email safe.
            </p>
          </div>

          {/* Current / Latest Letter — status only */}
          {latest && (
            <div className={"rounded-2xl border p-6 " + (latest.status === "released" ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5" : "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5")}>
              <div className="flex items-start gap-3">
                {latest.status === "released" ? <CheckCircle2 className="h-6 w-6 text-emerald-500 mt-0.5" /> : <Clock className="h-6 w-6 text-amber-500 mt-0.5" />}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Offer Letter</h3>
                  <p className={"text-xs font-semibold " + (latest.status === "released" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                    {latest.status === "released"
                      ? "Released — sent to your email"
                      : "Pending CEO review — you'll get it by email once released"}
                  </p>
                  {latest.salary ? <p className="text-xs text-slate-500 mt-1">Annual Salary: ₹{latest.salary.toLocaleString("en-IN")}</p> : null}
                  {latest.joiningDate && <p className="text-xs text-slate-500">Joining: {latest.joiningDate}</p>}
                  {latest.department && <p className="text-xs text-slate-500">Department: {latest.department}</p>}
                  {latest.designation && <p className="text-xs text-slate-500">Designation: {latest.designation}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">Requested: {new Date(latest.createdAt).toLocaleDateString("en-IN")}</p>
                  {latest.releasedAt && <p className="text-[10px] text-slate-400">Released: {new Date(latest.releasedAt).toLocaleDateString("en-IN")}</p>}
                </div>
              </div>
            </div>
          )}

          {/* History — status only */}
          {letters.length > 1 && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">History</h3>
              <div className="space-y-2">
                {letters.slice(1).map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{l.employeeName}</span>
                      <span className="text-slate-500">{new Date(l.createdAt).toLocaleDateString("en-IN")} · {l.department}</span>
                    </div>
                    <span className={"px-2.5 py-1 rounded-full text-[10px] font-bold border " + (l.status === "released" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30")}>
                      {l.status === "released" ? "SENT BY EMAIL" : "PENDING"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
