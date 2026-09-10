"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Building2, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff, Upload, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["bg-danger", "bg-warning", "bg-info", "bg-success", "bg-success"];

  if (!password) return null;

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ease-out ${
              i < strength ? colors[i] : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <p className={`text-xxs font-medium transition-colors duration-300 ${
        strength <= 1 ? "text-danger" : strength <= 2 ? "text-warning" : "text-success"
      }`}>
        {labels[Math.max(0, strength - 1)]}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "Software Engineering",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordsMatch = formData.password === formData.confirmPassword;
  const passwordError = formData.confirmPassword && !passwordsMatch ? "Passwords do not match" : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!passwordsMatch) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!selectedFile) {
      setError("Please upload an ID verification document file (.pdf, .png, .jpg) for HR verification");
      setLoading(false);
      return;
    }

    try {
      // 1. Upload document first
      let documentName = "";
      let documentUrl = "";
      if (selectedFile) {
        const formDataUpload = new FormData();
        formDataUpload.append("file", selectedFile);
        const uploadRes = await fetch("/api/hrm/v2/onboarding/upload", {
          method: "POST",
          body: formDataUpload,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          documentName = uploadData.data?.fileName || selectedFile.name;
          documentUrl = uploadData.data?.fileUrl || "";
        }
      }

      // 2. Submit Registration Request with document info
      const res = await fetch("/api/hrm/v2/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          email: formData.email,
          password: formData.password,
          displayName: formData.name,
          firstName: formData.name.split(" ")[0] || formData.name,
          lastName: formData.name.split(" ").slice(1).join(" ") || "",
          department: formData.department,
          documentName,
          documentUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      setSuccess("Documents submitted! Verification request sent to HR for approval.");
      setTimeout(() => router.push("/hrms"), 1800);
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
          <CardTitle className="text-2xl font-bold">Employee Registration</CardTitle>
          <CardDescription>Register & Submit Documents for HR Verification</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 text-xs">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs text-danger bg-danger/10 rounded-xl border border-danger/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-xs text-success bg-success/10 rounded-xl border border-success/20 font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <FormInput
              label="Full Name"
              icon={<User className="h-4 w-4" />}
              name="name"
              placeholder="e.g. Shivangi Gupta"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <FormInput
              label="Email Address"
              type="email"
              icon={<Mail className="h-4 w-4" />}
              name="email"
              placeholder="shivangi@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div>
              <FormInput
                label="Password"
                type={showPassword ? "text" : "password"}
                icon={<Lock className="h-4 w-4" />}
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
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
              <PasswordStrength password={formData.password} />
            </div>

            <FormInput
              label="Confirm Password"
              type={showConfirm ? "text" : "password"}
              icon={<Lock className="h-4 w-4" />}
              name="confirmPassword"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              error={passwordError}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="p-1 text-dark/50 hover:text-dark dark:hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {/* Step 2: Mandatory Real Document Upload */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Onboarding Document Verification <span className="text-red-500">*</span>
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-primary/40 rounded-xl bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:hover:bg-black/60 cursor-pointer transition-colors text-center"
              >
                <Upload className="h-6 w-6 text-primary mb-1" />
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {selectedFile ? selectedFile.name : "Click to Browse Govt ID / Passport File"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedFile
                    ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : "Mandatory for HR Approval & Employee Code Issuance"}
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Clock className="animate-spin h-4 w-4" />
                  Submitting to HR...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Register &amp; Submit Documents to HR
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
      </Card>
    </div>
  );
}
