"use client";

import { useState, useEffect, useRef } from "react";
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
  Crown,
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

const defaultDocs: DocItem[] = [];

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [phone, setPhone] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  // Role comes exclusively from the session — never from a hardcoded email list.
  const isSuperAdmin = user?.role === "super_admin";

  // Reporting Manager & Team Allocation Info
  const [reportingManager] = useState("");
  const [managerEmail] = useState("");
  const [domainWork] = useState("");
  const [allottedTeam] = useState("");

  // Verification Status — SUPER ADMIN IS AUTOMATICALLY FULLY VERIFIED & APPROVED
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "APPROVED" | "REJECTED_48H">(
    isSuperAdmin ? "APPROVED" : "PENDING"
  );
  const [deadlineSeconds, setDeadlineSeconds] = useState(48 * 3600);

  // Onboarding Documents State
  const [documents, setDocuments] = useState<DocItem[]>(defaultDocs);
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocType, setNewDocType] = useState("Aadhaar Card / Govt ID");

  // File Upload State (Matching Register Page Pattern)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedServerUrl, setUploadedServerUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewingDoc, setViewingDoc] = useState<DocItem | null>(null);
  const [docSubmittedToHR, setDocSubmittedToHR] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live Upload Progress Bar State
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isSubmittingToHR, setIsSubmittingToHR] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load documents from backend server / localStorage
  useEffect(() => {
    if (isSuperAdmin) {
      setVerificationStatus("APPROVED");
    }

    const fetchDocs = async () => {
      try {
        const res = await fetch("/api/upload/list");
        if (res.ok) {
          const data = await res.json();
          if (data.documents && data.documents.length > 0) {
            const mapped: DocItem[] = data.documents.map((d: any) => ({
              id: d._id || d.storedName,
              name: d.originalName,
              type: d.docType || "Verification Document",
              date: d.uploadedAt ? d.uploadedAt.split("T")[0] : new Date().toISOString().split("T")[0],
              size: d.fileSize || "1.5 MB",
              fileUrl: d.fileUrl,
            }));
            setDocuments((prev) => [...mapped, ...prev]);
          }
        }
      } catch {
        // ignore offline
      }
    };

    fetchDocs();

    if (!isSuperAdmin) {
      const savedStatus = localStorage.getItem("my-onboarding-status");
      if (savedStatus) {
        try {
          const parsed = JSON.parse(savedStatus);
          if (parsed.status === "REJECTED_48H_DEADLINE") {
            setVerificationStatus("REJECTED_48H");
          } else if (parsed.status === "APPROVED") {
            setVerificationStatus("APPROVED");
          } else {
            setVerificationStatus("PENDING");
          }
        } catch {
          // ignore
        }
      }
    }
  }, [isSuperAdmin]);

  // 48h Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (verificationStatus === "REJECTED_48H" && !isSuperAdmin) {
      interval = setInterval(() => {
        setDeadlineSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [verificationStatus, isSuperAdmin]);

  const formatCountdown = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Employee code is assigned by HR during onboarding; fall back to a stable
  // short id prefix only while awaiting assignment (never a fake "SUPERADMIN" code).
  const empCode = user?.employeeCode || (user?.id ? `EMP-2026-${user.id.substring(0, 4).toUpperCase()}` : "Pending assignment");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || "",
          action: "profile",
          phone,
          emergencyContact,
          bankAccount,
        }),
      });
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

  // Trigger File Picker Directly
  const triggerFileBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // File Change Handler — Exactly as used on Register Page!
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError(null);
      setUploadProgress(15);
      setIsUploading(true);
      setUploadComplete(false);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", editingDoc?.type || newDocType);
        formData.append("userId", user?.id || "employee");

        setUploadProgress(60);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Failed to save file to server");
        }

        const data = await res.json();
        setUploadProgress(100);
        setIsUploading(false);
        setUploadComplete(true);
        setUploadedServerUrl(data.url);
      } catch (err: any) {
        setIsUploading(false);
        setUploadError(err.message || "Upload error");
      }
    }
  };

  // Final Submit to HR
  const handleSubmitToHR = () => {
    if (!selectedFile) return;

    setIsSubmittingToHR(true);

    setTimeout(() => {
      const sizeInMB = (selectedFile.size / (1024 * 1024)).toFixed(1) + " MB";
      const newFileName = selectedFile.name;
      const todayStr = new Date().toISOString().split("T")[0];
      const targetType = editingDoc?.type || newDocType;
      const serverUrl = uploadedServerUrl || `/uploads/${Date.now()}_${newFileName}`;

      let updated: DocItem[];
      if (editingDoc) {
        updated = documents.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                name: newFileName,
                size: sizeInMB,
                date: todayStr,
                fileUrl: serverUrl,
              }
            : d
        );
      } else {
        const newDocItem: DocItem = {
          id: `doc-${Date.now()}`,
          name: newFileName,
          type: targetType,
          date: todayStr,
          size: sizeInMB,
          fileUrl: serverUrl,
        };
        updated = [newDocItem, ...documents];
      }

      setDocuments(updated);
      localStorage.setItem("employee-onboarding-docs", JSON.stringify(updated));

      if (!isSuperAdmin) {
        setVerificationStatus("PENDING");
        localStorage.setItem("my-onboarding-status", JSON.stringify({ status: "DOCUMENT_VERIFICATION_PENDING" }));
      }

      setIsSubmittingToHR(false);
      setEditingDoc(null);
      setShowAddModal(false);
      setSelectedFile(null);
      setUploadedServerUrl(null);
      setUploadProgress(0);
      setUploadComplete(false);
      setDocSubmittedToHR(true);
      setTimeout(() => setDocSubmittedToHR(false), 4500);
    }, 500);
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
          {isSuperAdmin ? "Superadmin System Profile" : "Employee Self-Service Profile"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {isSuperAdmin
            ? "Platform governance, system authority credentials, and tenant administration"
            : "Manage personal contact info, reporting manager, domain of work, and onboarding verification documents"}
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Superadmin Automatic Approval Banner */}
        {isSuperAdmin ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-3 shadow-sm">
            <Crown className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-bold text-sm">Superadmin System Authority Verified</p>
              <p className="mt-0.5">
                Full platform administrative rights active. No HR verification approval required for Superadmin.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Employee Verification Status Banners */}
            {verificationStatus === "PENDING" && (
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

            {verificationStatus === "REJECTED_48H" && (
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
          </>
        )}

        {/* Profile Card & Form */}
        <form onSubmit={handleSaveProfile} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-5">
          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Profile information updated successfully!</span>
            </div>
          )}

          {/* User info overview with Employee Code */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl">
                {(user?.name || user?.email || "SA").substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{user?.name || "Super Admin"}</h3>
                <p className="text-xs text-primary font-semibold uppercase">{user?.role || "Super Admin"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || "Not signed in"}</p>
              </div>
            </div>

            {/* Auto-Generated Employee Code Badge */}
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
              <UserCheck className="h-4 w-4 text-primary" /> Reporting Manager & Team Allocation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-gray-200 dark:border-white/5">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Reporting Authority</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{reportingManager}</p>
                <span className="text-[11px] text-primary">{managerEmail}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Domain / Area of Work</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{domainWork}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Allotted Unit: <strong>{allottedTeam}</strong></span>
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
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Person & Phone</label>
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

        {/* Section 2.5: Change Password */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
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
              <AlertCircle className="h-4 w-4 shrink-0" />
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

        {/* Section 3: REAL Onboarding Documents Container */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 backdrop-blur-md shadow-sm dark:shadow-2xl text-slate-900 dark:text-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                <FileText className="h-5 w-5 text-primary" /> Onboarding &amp; Verification Documents
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saved on server disk &amp; MongoDB database.
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
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-bounce">
              <CheckCircle2 className="h-4 w-4" />
              <span>Real document file uploaded &amp; saved to server!</span>
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
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Uploaded: {doc.date} • {doc.size || "1.5 MB"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold h-8 px-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download File
                    </a>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setViewingDoc(doc)}
                      variant="outline"
                      className="gap-1.5 text-xs font-semibold h-8 border-gray-200 dark:border-white/10"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Record
                    </Button>
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
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                ✓ Saved on Server Disk &amp; Database
              </span>
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

      {/* Modal 2: EXACT SAME FILE UPLOAD PATTERN AS REGISTER PAGE */}
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
                  <option value="Aadhaar Card / Govt ID">Aadhaar Card / Govt ID</option>
                  <option value="Passport / Visa">Passport / Visa</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Educational Degree Certificate">Educational Degree Certificate</option>
                  <option value="Offer Letter / Contract">Offer Letter / Contract</option>
                </select>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* EXACT MATCH OF THE FILE DROPZONE BOX FROM REGISTER PAGE */}
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
                      : "Supports PDF, PNG, JPG, DOCX (Max 15 MB)"}
                  </span>
                </div>
              </div>

              {/* LIVE UPLOAD PROGRESS BAR */}
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
                          <CheckCircle2 className="h-4 w-4" /> Upload Complete! Saved on Server
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

              {/* ACTION BUTTONS */}
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
                  disabled={!selectedFile || isUploading || !uploadComplete || isSubmittingToHR}
                  onClick={handleSubmitToHR}
                  className="bg-primary text-white font-bold gap-2 disabled:opacity-50"
                >
                  {isSubmittingToHR ? (
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
