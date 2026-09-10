"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if no session
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/hrms/login");
    }
  }, [user, authLoading, router]);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    if (newPassword === "Password@123" || pw === "Password@123")
      return "Please choose a password different from the temporary one";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!user?.id) {
      setError("Not logged in. Please login again.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "force-change-password",
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        // Redirect to dashboard after 1.5 seconds
        setTimeout(() => {
          // The middleware will no longer redirect since cookie is cleared
          const role = user?.role || "employee";
          const dashboards: Record<string, string> = {
            super_admin: "/hrms/superadmin",
            hr_admin: "/hrms/hr-admin",
            admin: "/hrms/hr-admin",
            manager: "/hrms/manager",
            employee: "/hrms/employee",
          };
          router.push(dashboards[role] || "/hrms/employee");
        }, 1500);
      } else {
        setError(data.error || "Failed to update password");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Password strength indicator
  const getStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, label: "Fair", color: "bg-amber-500" };
    return { score, label: "Strong", color: "bg-emerald-500" };
  };

  const strength = getStrength(newPassword);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-section-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Password Updated!</h1>
            <p className="text-sm text-slate-400 mt-2">
              Your password has been securely saved. Redirecting to your dashboard...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8 animate-section-in">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 shadow-lg shadow-primary/20">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your New Password</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            For your security, please set a new password before continuing.
            <br />
            This is required on your first login.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              <Lock className="h-3.5 w-3.5 inline mr-1.5" />
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Strength: <span className="font-semibold">{strength.label}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              <Lock className="h-3.5 w-3.5 inline mr-1.5" />
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Passwords do not match
              </p>
            )}
          </div>

          {/* Requirements */}
          <div className="rounded-xl bg-white/5 border border-white/5 p-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Requirements</p>
            {[
              { met: newPassword.length >= 8, label: "At least 8 characters" },
              { met: /[a-zA-Z]/.test(newPassword), label: "At least one letter" },
              { met: /[0-9]/.test(newPassword), label: "At least one number" },
              { met: newPassword !== "Password@123", label: "Different from temporary password" },
            ].map((req) => (
              <div key={req.label} className="flex items-center gap-2 text-[11px]">
                <CheckCircle2
                  className={`h-3 w-3 ${req.met ? "text-emerald-400" : "text-slate-600"}`}
                />
                <span className={req.met ? "text-emerald-400" : "text-slate-500"}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Updating...
              </>
            ) : (
              <>
                Set Password & Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
