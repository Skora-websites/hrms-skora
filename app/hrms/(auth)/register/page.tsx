"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Mail, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const DEPARTMENTS = [
  "Software Engineering",
  "Sales & Marketing",
  "Human Resources",
  "Finance",
  "Design",
  "Operations",
  "Customer Support",
];

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hrm/v2/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request-invite", email, department }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not send your request");
      }

      setRequested(true);
      setTimeout(() => router.push("/hrms/login"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md animate-section-in text-slate-900 dark:text-white">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/25">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Request an Account</CardTitle>
          <CardDescription>
            HR will review your request and email you a temporary password
          </CardDescription>
        </CardHeader>

        {requested ? (
          <CardContent className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <p className="font-bold text-sm">Request sent to HR!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Once approved, a welcome email with your temporary password will
              arrive at <span className="font-semibold">{email}</span>. You&apos;ll
              create your own password at first sign-in.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-3 text-xs text-danger bg-danger/10 rounded-xl border border-danger/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <FormInput
                label="Work Email Address"
                type="email"
                icon={<Mail className="h-4 w-4" />}
                name="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <select
                  name="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                That&apos;s all we need. Your password is created by you, at your
                first sign-in, using the temporary password emailed to you.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
                {loading ? (
                  "Sending request..."
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Request Account
                  </span>
                )}
              </Button>

              <p className="text-sm text-dark/70 dark:text-gray-400 text-center">
                Already have an account?{" "}
                <Link href="/hrms/login" className="text-primary hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
