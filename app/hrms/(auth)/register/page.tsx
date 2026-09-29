"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Send, Loader2, User, Briefcase, Users, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

// Reference-form departments (SKORA HRMS onboarding form).
const DEPARTMENTS = [
  "Software Development",
  "Quality Assurance",
  "IT Infrastructure",
  "DevOps",
  "Technical Support",
  "Mobile Technology",
  "HR Recruitment",
];

const YES_NO = ["Yes", "No"] as const;

interface FormState {
  employeeName: string;
  gender: "Male" | "Female";
  designation: string;
  dateOfJoining: string;
  department: string;
  dateOfBirth: string;
  email: string;
  uanNo: string;
  joiningLocation: string;
  panNo: string;
  mobileNo: string;
  aadharNo: string;
  presentAddress: string;
  permanentAddress: string;
  annualCtc: string;
  maritalStatus: "Yes" | "No";
  spouseName: string;
  hasPf: "Yes" | "No";
  previousPfNumber: string;
  epfSalary: string;
  previousEsiNo: string;
  esicDispensary: string;
  nomineeName: string;
  nomineeDob: string;
  nomineeAadhar: string;
  nomineeRelation: string;
  fatherName: string;
  husbandName: string;
  nameInBank: string;
  bankAccountNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
}

const INITIAL: FormState = {
  employeeName: "",
  gender: "Male",
  designation: "",
  dateOfJoining: "",
  department: DEPARTMENTS[0],
  dateOfBirth: "",
  email: "",
  uanNo: "",
  joiningLocation: "",
  panNo: "",
  mobileNo: "",
  aadharNo: "",
  presentAddress: "",
  permanentAddress: "",
  annualCtc: "",
  maritalStatus: "Yes",
  spouseName: "",
  hasPf: "Yes",
  previousPfNumber: "",
  epfSalary: "",
  previousEsiNo: "",
  esicDispensary: "",
  nomineeName: "",
  nomineeDob: "",
  nomineeAadhar: "",
  nomineeRelation: "",
  fatherName: "",
  husbandName: "",
  nameInBank: "",
  bankAccountNumber: "",
  bankName: "",
  branchName: "",
  ifscCode: "",
};

// Client-side mirror of the server's rules: only the email address is
// mandatory (the account identifier); every other field — name, designation,
// joining date, mobile, UAN, PAN, Aadhar, addresses, nominee, bank — is
// optional but format-checked when a value IS supplied.
function validate(f: FormState): string | null {
  if (!f.email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Please enter a valid email address";
  if (f.mobileNo.trim() && !/^[0-9+\-\s]{10,15}$/.test(f.mobileNo.trim())) return "Mobile No must be 10–15 digits";
  if (f.uanNo.trim() && !/^\d{12}$/.test(f.uanNo.trim())) return "UAN No must be exactly 12 digits";
  if (f.panNo.trim() && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(f.panNo.trim().toUpperCase())) return "PAN No must look like ABCDE1234F";
  if (f.aadharNo.trim() && !/^\d{12}$/.test(f.aadharNo.trim())) return "Aadhar No must be exactly 12 digits";
  if (f.ifscCode.trim() && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(f.ifscCode.trim().toUpperCase())) return "IFSC Code must look like SBIN0001234";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState("");

  const set = (k: keyof FormState) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hrm/v2/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-invite", ...form }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not send your request");
      }

      setRequestedEmail(form.email.trim());
      setRequested(true);
      setTimeout(() => router.push("/hrms/login"), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary";
  const labelCls = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

  const Section = ({
    icon, title, children,
  }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 sm:p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white border-l-4 border-primary pl-3 py-1 bg-slate-50 dark:bg-white/5 rounded-r-lg">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );

  const RadioRow = ({
    label, value, onChange,
  }: { label: string; value: "Yes" | "No"; onChange: (v: "Yes" | "No") => void }) => (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-6 py-1">
        {YES_NO.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="radio"
              name={label}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-primary"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary">SKORA HRMS — Onboarding Form</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            HR will review your submission and email a temporary password to your address —
            only your email is required; everything else is optional
          </p>
        </div>

        {requested ? (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-10 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <p className="font-bold text-sm text-slate-900 dark:text-white">Onboarding form sent to HR!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Once approved, a welcome email with your temporary password will arrive at{" "}
              <span className="font-semibold">{requestedEmail}</span>. You&apos;ll create your own password at
              first sign-in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-danger bg-danger/10 rounded-xl border border-danger/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* ── Personal and Contact Details ── */}
            <Section icon={<User className="h-4 w-4 text-primary" />} title="Personal and Contact Details:">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Employee Name as per Aadhar</label>
                  <input className={inputCls} value={form.employeeName} onChange={(e) => set("employeeName")(e.target.value)} />
                </div>
                <div>
                  <span className={labelCls}>Gender</span>
                  <div className="flex items-center gap-6 py-1.5">
                    {(["Male", "Female"] as const).map((g) => (
                      <label key={g} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input type="radio" name="gender" checked={form.gender === g} onChange={() => set("gender")(g)} className="accent-primary" />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Designation</label>
                  <input className={inputCls} value={form.designation} onChange={(e) => set("designation")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Date of Joining (DOJ)</label>
                  <input type="date" className={inputCls} value={form.dateOfJoining} onChange={(e) => set("dateOfJoining")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Department *</label>
                  <select className={inputCls} value={form.department} onChange={(e) => set("department")(e.target.value)}>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Date of Birth (DOB)</label>
                  <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Email *</label>
                  <input type="email" className={inputCls} placeholder="you@company.com" value={form.email} onChange={(e) => set("email")(e.target.value)} required />
                </div>
              </div>
            </Section>

            {/* ── Employment Details ── */}
            <Section icon={<Briefcase className="h-4 w-4 text-primary" />} title="Employment Details:">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>UAN No</label>
                  <input className={inputCls} inputMode="numeric" maxLength={12} value={form.uanNo} onChange={(e) => set("uanNo")(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className={labelCls}>Joining Location</label>
                  <input className={inputCls} value={form.joiningLocation} onChange={(e) => set("joiningLocation")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>PAN No</label>
                  <input className={inputCls} maxLength={10} value={form.panNo} onChange={(e) => set("panNo")(e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className={labelCls}>Mobile No</label>
                  <input className={inputCls} type="tel" value={form.mobileNo} onChange={(e) => set("mobileNo")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Aadhar No</label>
                  <input className={inputCls} inputMode="numeric" maxLength={12} value={form.aadharNo} onChange={(e) => set("aadharNo")(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className={labelCls}>Annual CTC</label>
                  <input className={inputCls} value={form.annualCtc} onChange={(e) => set("annualCtc")(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Present Address</label>
                  <textarea rows={2} className={inputCls} value={form.presentAddress} onChange={(e) => set("presentAddress")(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Permanent Address</label>
                  <textarea rows={2} className={inputCls} value={form.permanentAddress} onChange={(e) => set("permanentAddress")(e.target.value)} />
                </div>
                <RadioRow label="Marital Status" value={form.maritalStatus} onChange={(v) => set("maritalStatus")(v)} />
                {form.maritalStatus === "Yes" && (
                  <div>
                    <label className={labelCls}>Spouse Name (if Married)</label>
                    <input className={inputCls} value={form.spouseName} onChange={(e) => set("spouseName")(e.target.value)} />
                  </div>
                )}
                <RadioRow label="Previous Employer PF Number" value={form.hasPf} onChange={(v) => set("hasPf")(v)} />
                {form.hasPf === "Yes" && (
                  <div>
                    <label className={labelCls}>Previous PF Number</label>
                    <input className={inputCls} value={form.previousPfNumber} onChange={(e) => set("previousPfNumber")(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className={labelCls}>EPF Salary</label>
                  <input className={inputCls} value={form.epfSalary} onChange={(e) => set("epfSalary")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Previous ESI No. (if any)</label>
                  <input className={inputCls} value={form.previousEsiNo} onChange={(e) => set("previousEsiNo")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>ESIC Dispensary</label>
                  <input className={inputCls} value={form.esicDispensary} onChange={(e) => set("esicDispensary")(e.target.value)} />
                </div>
              </div>
            </Section>

            {/* ── Nominee Details ── */}
            <Section icon={<Users className="h-4 w-4 text-primary" />} title="Nominee Details:">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nominee Name</label>
                  <input className={inputCls} value={form.nomineeName} onChange={(e) => set("nomineeName")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Nominee DOB</label>
                  <input type="date" className={inputCls} value={form.nomineeDob} onChange={(e) => set("nomineeDob")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Nominee Aadhar</label>
                  <input className={inputCls} inputMode="numeric" maxLength={12} value={form.nomineeAadhar} onChange={(e) => set("nomineeAadhar")(e.target.value.replace(/\D/g, ""))} />
                </div>
                <div>
                  <label className={labelCls}>Relation with Nominee</label>
                  <input className={inputCls} value={form.nomineeRelation} onChange={(e) => set("nomineeRelation")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Father Name</label>
                  <input className={inputCls} value={form.fatherName} onChange={(e) => set("fatherName")(e.target.value)} />
                </div>
                {form.maritalStatus === "Yes" && (
                  <div>
                    <label className={labelCls}>Husband&apos;s Name (if Married)</label>
                    <input className={inputCls} value={form.husbandName} onChange={(e) => set("husbandName")(e.target.value)} />
                  </div>
                )}
              </div>
            </Section>

            {/* ── Bank Details ── */}
            <Section icon={<Landmark className="h-4 w-4 text-primary" />} title="Bank Details:">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Name in Bank</label>
                  <input className={inputCls} value={form.nameInBank} onChange={(e) => set("nameInBank")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bank Account Number</label>
                  <input className={inputCls} value={form.bankAccountNumber} onChange={(e) => set("bankAccountNumber")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Bank Name</label>
                  <input className={inputCls} value={form.bankName} onChange={(e) => set("bankName")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Branch Name</label>
                  <input className={inputCls} value={form.branchName} onChange={(e) => set("branchName")(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>IFSC Code</label>
                  <input className={inputCls} maxLength={11} value={form.ifscCode} onChange={(e) => set("ifscCode")(e.target.value.toUpperCase())} />
                </div>
              </div>
            </Section>

            <div className="flex flex-col items-center gap-3 pb-6">
              <Button type="submit" className="w-full sm:w-64 h-11 font-bold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Submit
                  </span>
                )}
              </Button>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Already have an account?{" "}
                <Link href="/hrms/login" className="text-primary hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
