"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  FileText,
  CheckCircle2,
  IdCard,
  Eye,
  Pencil,
  Upload,
  FileUp,
  X,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Download,
  Plus,
  Lock,
  AlertCircle,
} from "lucide-react";

interface DocItem {
  id: string;
  name: string;
  type: string;
  date: string;
  size: string;
  fileUrl?: string;
}

const DOC_TYPES = [
  "Aadhaar Card / Govt ID",
  "Passport / Visa",
  "PAN Card",
  "Educational Degree Certificate",
  "Offer Letter / Contract",
];

export default function EmployeeProfilePage() {
  const { user, refresh } = useAuth() as any;
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [reportingManager, setReportingManager] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [domainWork, setDomainWork] = useState("");
  const [allottedTeam, setAllottedTeam] = useState("");

  const isSuperAdmin = user?.role === "super_admin";

  // Verification status comes from the server (user record + latest onboarding
  // task), never from localStorage — that caused stale "pending" banners.
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "APPROVED" | "REJECTED_48H">("PENDING");
  const [deadlineSeconds, setDeadlineSeconds] = useState(48 * 3600);

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocType, setNewDocType] = useState(DOC_TYPES[0]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedServerUrl, setUploadedServerUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);
  const [docSubmittedToHR, setDocSubmittedToHR] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittingToHR, setSubmittingToHR] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load profile fields + onboarding task (status, deadline, document) from DB.
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/hrm/v2/users?action=get&userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const u = data.data || {};
        setPhone(u.phone || "");
        setEmergencyContact(u.emergencyContact || "");
        setBankAccount(u.bankAccount || "");
        setReportingManager(u.reportingManager || "");
        setManagerEmail(u.managerEmail || "");
        setDomainWork(u.domainWork || "");
        setAllottedTeam(u.allottedTeam || "");

        const rejected = (u.onboardingStatus || "").toLowerCase().includes("reject");
        const approved = u.status === "active" && !rejected && !u.onboardingStatus?.includes("pending");
        setVerificationStatus(rejected ? "REJECTED_48H" : approved ? "APPROVED" : "PENDING");
      }
    } catch { /* ignore */ }

    try {
      const t = await fetch(`/api/hrm/v2/onboarding?employeeTasks=true&userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      if (t.ok) {
        const rows = (await t.json()).data || [];
        const task = Array.isArray(rows) ? rows[0] : null;
        if (task) {
          if (task.status === "rejected") setVerificationStatus("REJECTED_48H");
          else if (task.status === "approved" || task.status === "completed") {
            setVerificationStatus("APPROVED");
          }
          if (task.rejectionDeadline) {
            const remaining = Math.floor((new Date(task.rejectionDeadline).getTime() - Date.now()) / 1000);
            if (remaining > 0) setDeadlineSeconds(remaining);
          }
          if (task.documentUrl) {
            const docType = task.documentName || "Verification Document";
            setDocuments([{
              id: task.id || task._id || "task-doc",
              name: task.documentName || "document",
              type: docType,
              date: task.updatedAt ? new Date(task.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
              size: "—",
              fileUrl: task.documentUrl,
            }]);
          }
        }
      }
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 48h countdown while rejected
  useEffect(() => {
    if (verificationStatus !== "REJECTED_48H" || isSuperAdmin) return;
    const interval = setInterval(() => {
      setDeadlineSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [verificationStatus, isSuperAdmin]);

  const formatCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const empCode = user?.employeeCode || "Pending assignment";

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || "",
          action: "profile",
          phone,
          emergencyContact,
          bankAccount,
          reportingManager,
          managerEmail,
          domainWork,
          allottedTeam,
        }),
      });
      if (!res.ok) throw new Error(((await res.json()).error) || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refresh?.();
    } catch (err: any) {
      setSaveError(err?.message || "Save failed");
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("New password must contain at least one letter and one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from the current password.");
      return;
    }

    setPasswordSaving(true);
    try {
      if (!user?.id) { setPasswordError("Not logged in"); return; }
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "change-password", currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) { setPasswordSuccess(true); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setTimeout(() => setPasswordSuccess(false), 4000); }
      else { setPasswordError(data.error || "Failed"); }
    } catch (err: any) { setPasswordError(err?.message || "Failed"); }
    setPasswordSaving(false);
  };

  const triggerFileBrowse = () => {
    fileInputRef.current?.click();
  };

  // Upload the file, then attach it to the user's onboarding task.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadError(null);
    setUploadProgress(15);
    setIsUploading(true);
    setUploadComplete(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", editingDoc?.type || newDocType);

      const res = await fetch("/api/hrm/v2/onboarding/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setUploadProgress(100);
      setUploadedServerUrl(data.data?.fileUrl || null);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err?.message || "Upload error");
      return;
    }
    setIsUploading(false);
    setUploadComplete(true);
  };

  // Submit: PATCH onboarding attach_document → task goes pending for HR review.
  const handleSubmitToHR = async () => {
    if (!selectedFile || !uploadedServerUrl) return;
    setSubmittingToHR(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/hrm/v2/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "attach_document",
          documentName: selectedFile.name,
          documentUrl: uploadedServerUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Submission to HR failed");

      setDocuments([{
        id: `doc-${Date.now()}`,
        name: selectedFile.name,
        type: editingDoc?.type || newDocType,
        date: new Date().toISOString().split("T")[0],
        size: (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB",
        fileUrl: uploadedServerUrl,
      }]);
      setVerificationStatus("PENDING");
      setDocSubmittedToHR(true);
      setTimeout(() => setDocSubmittedToHR(false), 4500);
      setEditingDoc(null);
      setShowAddModal(false);
      setSelectedFile(null);
      setUploadedServerUrl(null);
      setUploadProgress(0);
      setUploadComplete(false);
      loadProfile();
    } catch (err: any) {
      setUploadError(err?.message || "Submission failed");
    }
    setSubmittingToHR(false);
  };

  return (
    <AppShell title="My Employee Profile">
      {/* Hidden File Input — Always mounted in DOM */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {isSuperAdmin ? "Superadmin System Profile" : "Employee Profile"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isSuperAdmin
            ? "Platform governance, system authority credentials, and tenant administration"
            : "Manage personal contact info, reporting manager, domain of work, and onboarding verification documents"}
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {!isSuperAdmin && verificationStatus === "PENDING" && (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-3">
            <Clock className="h-5 w-5 shrink-0 text-yellow-500 animate-pulse mt-0.5" />
            <div>
              <p className="font-bold text-sm">Document Verification Pending with HR</p>
              <p className="mt-0.5">
                Your onboarding verification documents are under review by HR Admin. Official Employee Code will be issued once approved.
              </p>
            </div>
          </div>
        )}

        {!isSuperAdmin && verificationStatus === "REJECTED_48H" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-xs text-red-700 dark:text-red-400 flex items-start gap-3 shadow-lg">
            <AlertTriangle className="h-6 w-6 shrink-0 text-red-500 animate-bounce mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-red-600 dark:text-red-300">⚠️ Document Verification Rejected by HR</p>
                <span className="font-mono font-extrabold text-sm text-red-600 dark:text-red-400 bg-red-500/20 px-3 py-1 rounded-lg border border-red-500/30">
                  Deadline: {formatCountdown(deadlineSeconds)}
                </span>
              </div>
              <p className="mt-1 leading-relaxed">
                HR Admin rejected your uploaded document. You have <strong>48 Hours</strong> to edit and upload a valid document file below, or your registration will be cancelled/held.
              </p>
            </div>
          </div>
        )}

        {/* Profile Card & Form */}
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-5">
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Profile information updated successfully!</span>
            </div>
          )}
          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold">
              <AlertCircle className="h-4 w-4" />
              <span>{saveError}</span>
            </div>
          )}

          {/* User info overview with Employee Code */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">
                {(user?.name || user?.email || "SA").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{user?.name || "Employee"}</h3>
                <p className="text-xs text-primary font-semibold uppercase">{user?.role || "Employee"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || "Not signed in"}</p>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Employee Code</span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-mono font-bold text-primary shadow-sm">
                <IdCard className="h-4 w-4 text-primary" />
                {empCode}
              </span>
            </div>
          </div>

          {/* Section 1: Reporting Manager & Team Assignment */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Reporting Manager &amp; Team Allocation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/5">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Reporting Authority</label>
                <input
                  type="text"
                  value={reportingManager}
                  onChange={(e) => setReportingManager(e.target.value)}
                  placeholder="Manager name"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="Manager email"
                  className="w-full mt-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-[11px] text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Domain / Area of Work</label>
                <input
                  type="text"
                  value={domainWork}
                  onChange={(e) => setDomainWork(e.target.value)}
                  placeholder="e.g. Frontend Development"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                />
                <input
                  type="text"
                  value={allottedTeam}
                  onChange={(e) => setAllottedTeam(e.target.value)}
                  placeholder="Allotted Unit / Team"
                  className="w-full mt-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Emergency Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Person &amp; Phone</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payroll Bank Account Details</label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" className="bg-primary text-white hover:bg-primary/90 font-bold shadow-md">
              Save Profile Changes
            </Button>
          </div>
        </form>

        {/* Change Password */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
              <Lock className="h-5 w-5 text-primary" /> Change Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update your login password. Your new password will be used the next time you sign in.
            </p>
          </div>

          {passwordSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Password updated successfully! Use your new password on next login.</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold">
              <AlertCircle className="h-4 w-4" />
              <span>{passwordError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Lock className="h-3.5 w-3.5 inline mr-1" /> Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Lock className="h-3.5 w-3.5 inline mr-1" /> New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, letters + numbers"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Lock className="h-3.5 w-3.5 inline mr-1" /> Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <Button
              type="button"
              onClick={handlePasswordChange}
              disabled={passwordSaving}
              className="bg-primary text-white hover:bg-primary/90 font-bold gap-1.5 shadow-md"
            >
              <Lock className="h-3.5 w-3.5" />
              {passwordSaving ? "Updating..." : "Save New Password"}
            </Button>
          </div>
        </div>

        {/* Onboarding Documents */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText className="h-5 w-5 text-primary" /> Onboarding &amp; Verification Documents
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload a document and submit it to HR for verification.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setEditingDoc(null);
                setSelectedFile(null);
                setUploadedServerUrl(null);
                setUploadProgress(0);
                setUploadComplete(false);
              }}
              className="bg-primary text-white hover:bg-primary/90 font-bold text-xs gap-1.5 shadow-md"
            >
              <Plus className="h-4 w-4" /> Add Document
            </Button>
          </div>

          {docSubmittedToHR && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Document submitted to HR for verification.</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-bold">
              {uploadError}
            </div>
          )}

          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block text-sm">{doc.type}</span>
                    <span className="text-primary font-mono text-xs block font-bold">{doc.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Uploaded: {doc.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold h-8 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download File
                    </a>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      setEditingDoc(doc);
                      setShowAddModal(false);
                      setSelectedFile(null);
                      setUploadedServerUrl(null);
                      setUploadProgress(0);
                      setIsUploading(false);
                      setUploadComplete(false);
                    }}
                    className="gap-1.5 text-xs font-semibold h-8 bg-primary text-white font-bold"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Replace Upload
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal 1: View Document Preview */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Document Preview: {viewingDoc.type}
              </h3>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-white text-xs font-bold">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 text-center bg-slate-50 dark:bg-black/40 rounded-xl border border-dashed border-gray-200 dark:border-white/10 space-y-3">
              <FileText className="h-14 w-14 text-primary mx-auto" />
              <p className="font-mono font-bold text-sm text-primary">{viewingDoc.name}</p>
            </div>

            <div className="flex justify-end gap-2">
              {viewingDoc.fileUrl && (
                <a
                  href={viewingDoc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  <Download className="h-3.5 w-3.5" /> Download File
                </a>
              )}
              <Button onClick={() => setViewingDoc(null)} variant="outline" className="text-xs font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Upload Document */}
      {(editingDoc || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" /> {editingDoc ? `Upload New File (${editingDoc.type})` : "Add New Onboarding Document"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setShowAddModal(false);
                  setSelectedFile(null);
                  setUploadedServerUrl(null);
                  setUploadProgress(0);
                  setUploadComplete(false);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!editingDoc && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">Document Type</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-primary focus:outline-none"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5 pt-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Select Document File <span className="text-red-500">*</span>
                </label>

                <div
                  onClick={triggerFileBrowse}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/40 rounded-xl bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:hover:bg-black/60 cursor-pointer transition-colors text-center"
                >
                  <Upload className="h-8 w-8 text-primary mb-2 animate-bounce" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {selectedFile ? selectedFile.name : "Click to Browse Govt ID / Passport File"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {selectedFile
                      ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : "Supports PDF, PNG, JPG, DOCX (Max 10 MB)"}
                  </span>
                </div>
              </div>

              {selectedFile && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {isUploading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          Uploading to server...
                        </>
                      ) : uploadComplete ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="h-4 w-4" /> Upload Complete
                        </span>
                      ) : (
                        "Ready to Upload"
                      )}
                    </span>
                    <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
                  </div>

                  <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingDoc(null);
                    setShowAddModal(false);
                    setSelectedFile(null);
                    setUploadedServerUrl(null);
                    setUploadProgress(0);
                    setUploadComplete(false);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={!selectedFile || isUploading || !uploadComplete || submittingToHR}
                  onClick={handleSubmitToHR}
                  className="bg-primary text-white font-bold gap-2 disabled:opacity-50"
                >
                  {submittingToHR ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting to HR...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Document to HR
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
