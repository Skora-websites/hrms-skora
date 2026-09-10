"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { FileText, Building2, Mail, CheckCircle2, Loader2, Palette, PenLine } from "lucide-react";

interface OfferLetterSettings {
  companyName: string;
  companyTagline: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  signatoryName: string;
  signatoryTitle: string;
  templateHeader: string;
  templateBody: string;
  templateFooter: string;
  pdfPasswordEnabled: boolean;
  pdfWatermark: string;
  autoEmailOnRelease: boolean;
  emailSubject: string;
  emailBody: string;
}

const DEFAULT: OfferLetterSettings = {
  companyName: "SKORA",
  companyTagline: "Innovation · Excellence · Growth",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  signatoryName: "Vishal Srivastava",
  signatoryTitle: "CEO, Skora",
  templateHeader: "",
  templateBody: "We are delighted to extend this offer of employment to you. After careful consideration of your qualifications and experience, we believe you will be a valuable addition to our team.",
  templateFooter: "We look forward to welcoming you to the team and are confident that your contributions will be instrumental in driving our success.\n\nPlease confirm your acceptance of this offer by signing and returning this letter.",
  pdfPasswordEnabled: true,
  pdfWatermark: "",
  autoEmailOnRelease: false,
  emailSubject: "Your Offer Letter from {{companyName}}",
  emailBody: "Dear {{employeeName}},\n\nYour offer letter has been released. Please find it attached.\n\nBest regards,\n{{signatoryName}}",
};

export default function OfferLetterSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [s, setS] = useState<OfferLetterSettings>(DEFAULT);

  useEffect(() => {
    fetch("/api/hrm/v2/offer-letter-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.data) setS(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/hrm/v2/offer-letter-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: s }),
      });
      if (!res.ok) {
        setError("Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const u = (k: keyof OfferLetterSettings, v: string | boolean) =>
    setS((p) => ({ ...p, [k]: v }));

  const inp =
    "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary";

  return (
    <AppShell title="Offer Letter Settings">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Offer Letter Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure company branding, template content, and PDF options for offer letters</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSave} className="max-w-3xl space-y-6">
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Settings saved successfully!
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">{error}</div>
          )}

          {/* Company Branding */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" /> Company Branding
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                <input value={s.companyName} onChange={(e) => u("companyName", e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tagline</label>
                <input value={s.companyTagline} onChange={(e) => u("companyTagline", e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea rows={2} value={s.companyAddress} onChange={(e) => u("companyAddress", e.target.value)} className={inp + " resize-none"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input value={s.companyPhone} onChange={(e) => u("companyPhone", e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input value={s.companyEmail} onChange={(e) => u("companyEmail", e.target.value)} className={inp} />
                </div>
              </div>
            </div>
          </div>

          {/* Signatory */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <PenLine className="h-5 w-5 text-blue-500" /> Signatory
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input value={s.signatoryName} onChange={(e) => u("signatoryName", e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input value={s.signatoryTitle} onChange={(e) => u("signatoryTitle", e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Template Content */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-500" /> Template Content
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Opening Paragraph</label>
                <textarea rows={4} value={s.templateBody} onChange={(e) => u("templateBody", e.target.value)} className={inp + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Closing Paragraph</label>
                <textarea rows={4} value={s.templateFooter} onChange={(e) => u("templateFooter", e.target.value)} className={inp + " resize-none"} />
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  <strong>Variables:</strong> {"{{employeeName}}"}, {"{{employeeEmail}}"}, {"{{department}}"}, {"{{designation}}"}, {"{{salary}}"}, {"{{joiningDate}}"}, {"{{companyName}}"}, {"{{signatoryName}}"}
                </p>
              </div>
            </div>
          </div>

          {/* PDF Options */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-yellow-500" /> PDF Options
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">Password Protection</span>
                  <span className="text-[11px] text-slate-500">Each offer letter gets a unique password</span>
                </div>
                <button
                  type="button"
                  onClick={() => u("pdfPasswordEnabled", !s.pdfPasswordEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.pdfPasswordEnabled ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.pdfPasswordEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Watermark Text (optional)</label>
                <input value={s.pdfWatermark} onChange={(e) => u("pdfWatermark", e.target.value)} placeholder="CONFIDENTIAL" className={inp} />
              </div>
            </div>
          </div>

          {/* Email on Release */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white">
            <h3 className="font-bold text-base flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-orange-500" /> Email on Release
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-100 dark:border-white/5">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">Auto-Email on Release</span>
                  <span className="text-[11px] text-slate-500">Send offer letter via email when CEO releases it</span>
                </div>
                <button
                  type="button"
                  onClick={() => u("autoEmailOnRelease", !s.autoEmailOnRelease)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.autoEmailOnRelease ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.autoEmailOnRelease ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {s.autoEmailOnRelease && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Subject</label>
                    <input value={s.emailSubject} onChange={(e) => u("emailSubject", e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Body</label>
                    <textarea rows={5} value={s.emailBody} onChange={(e) => u("emailBody", e.target.value)} className={inp + " resize-none"} />
                  </div>
                </>
              )}
            </div>
          </div>

          <Button type="submit" disabled={saving} className="bg-primary text-white font-bold px-6 py-2.5 shadow-md disabled:opacity-50">
            {saving ? "Saving..." : "Save Offer Letter Settings"}
          </Button>
        </form>
      )}
    </AppShell>
  );
}
