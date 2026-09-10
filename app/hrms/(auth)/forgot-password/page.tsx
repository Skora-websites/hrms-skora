"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Mail,
  Lock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email") || "";
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/hrm/v2/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password", email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send password reset email");
      }

      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/hrm/v2/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm-reset-password",
          token,
          email: emailParam,
          newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset password");
      }

      setResetDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md animate-section-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/25">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {resetDone ? "Password Reset" : isResetMode ? "Set New Password" : "Reset password"}
          </CardTitle>
          <CardDescription>
            {resetDone
              ? "Your password has been reset successfully"
              : isResetMode
                ? "Enter your new password below"
                : sent
                  ? "Check your email for the reset link"
                  : "Enter your email and we&apos;ll send you a reset link"}
          </CardDescription>
        </CardHeader>

        {resetDone ? (
          <>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 rounded-xl border border-success/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Your password has been reset successfully. You can now sign in with your new password.
              </div>
            </CardContent>
            <CardFooter>
              <Link href="/hrms/login" className="w-full">
                <Button className="w-full h-11">Sign In</Button>
              </Link>
            </CardFooter>
          </>
        ) : isResetMode ? (
          <form onSubmit={handleConfirmReset}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-danger bg-danger/10 rounded-xl border border-danger/20 animate-form-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <FormInput
                label="New Password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                icon={<Lock className="h-4 w-4" />}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-dark/50 hover:text-dark dark:hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <FormInput
                label="Confirm New Password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your new password"
                icon={<Lock className="h-4 w-4" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmPassword && newPassword !== confirmPassword ? "Passwords do not match" : undefined}
              />
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <Link href="/hrms/login" className="text-sm text-primary hover:underline font-semibold text-center">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Back to sign in
              </Link>
            </CardFooter>
          </form>
        ) : sent ? (
          <>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 rounded-xl border border-success/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                If an account exists with that email, a password reset link has been sent. Please check your inbox.
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button variant="outline" className="w-full h-11" onClick={() => { setSent(false); setEmail(""); }}>
                <Send className="h-4 w-4 mr-2" /> Send again
              </Button>
              <Link href="/hrms/login" className="text-sm text-primary hover:underline font-semibold text-center">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Back to sign in
              </Link>
            </CardFooter>
          </>
        ) : (
          <form onSubmit={handleRequestReset}>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-danger bg-danger/10 rounded-xl border border-danger/20 animate-form-error">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <FormInput
                label="Email"
                type="email"
                placeholder="name@company.com"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                helperText="You'll receive a password reset link at this email"
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Send Reset Link</span>
                )}
              </Button>
              <Link href="/hrms/login" className="text-sm text-primary hover:underline font-semibold text-center">
                <ArrowLeft className="h-3 w-3 inline mr-1" /> Back to sign in
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
