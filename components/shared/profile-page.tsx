"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { User, Mail, Phone, Shield, Save, CheckCircle2, Camera, Lock, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

interface UserProfile { id: string; name: string; email: string; phone?: string; role: string; department?: string; designation?: string; employeeCode?: string; image?: string; }
interface ProfilePageProps { roleLabel: string; backHref: string; }

export default function ProfilePage({ roleLabel, backHref }: ProfilePageProps) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Wait for auth to load, then fetch profile
  useEffect(() => {
    if (authLoading || !user) return;

    // Set profile from auth context immediately
    setProfile({ id: user.id, name: user.name || "", email: user.email || "", role: user.role, image: user.image || undefined });
    setName(user.name || "");

    // Try to load profile image from MongoDB
    fetch("/api/upload?userId=" + user.id)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.image) {
          setPreviewImage(data.image);
          setProfile((prev) => prev ? { ...prev, image: data.image } : prev);
        }
      })
      .catch(() => {});

    // Try to load additional profile data
    fetch("/api/hrm/v2/users?action=get&userId=" + user.id)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.data) {
          const d = data.data;
          setProfile((prev) => prev ? { ...prev, phone: d.phone, department: d.department, designation: d.designation, employeeCode: d.employeeCode } : prev);
          if (d.phone) setPhone(d.phone);
          if (d.department) setDepartment(d.department);
          if (d.designation) setDesignation(d.designation);
          if (d.image) {
            setPreviewImage(d.image);
            setProfile((prev) => prev ? { ...prev, image: d.image } : prev);
          }
        }
      })
      .catch(() => {});
  }, [user, authLoading]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Create instant preview using FileReader (no server needed)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // 2. Update preview immediately
      setPreviewImage(dataUrl);

      // 3. Save to server in background
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);
      const res = await fetch("/api/upload?userId=" + encodeURIComponent(user.id), { method: "POST", body: formData });

      if (res.ok) {
        const result = await res.json();
        // Update with the server-returned URL
        setPreviewImage(result.url);
        setProfile((prev) => prev ? { ...prev, image: result.url } : prev);

        // Also save to user profile
        await fetch("/api/hrm/v2/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, action: "profile", image: result.url }),
        });
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "profile", displayName: name, phone, department, designation }),
      });
    } catch {}
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const displayName = name || profile?.name || user?.name || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const displayImage = previewImage || profile?.image;

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
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      if (!user?.id) {
        setPasswordError("You must be logged in to change your password.");
        return;
      }
      const res = await fetch("/api/hrm/v2/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 4000);
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading) {
    return (
      <AppShell title="My Profile">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My Profile">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View and update your personal information</p>
      </div>
      {saved && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Profile updated!
        </div>
      )}

      {/* Avatar Card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6 text-slate-900 dark:text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-primary/20 overflow-hidden">
              {displayImage ? (
                <img src={displayImage} alt={displayName} className="w-24 h-24 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {/* Camera overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 w-full h-full rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              {uploading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            {/* Hidden file input - sibling of the button, not nested */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleImageUpload}
              style={{ position: "absolute", width: "1px", height: "1px", opacity: 0, overflow: "hidden" }}
            />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{displayName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{roleLabel}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
              {profile?.employeeCode && (
                <span className="text-primary font-mono font-bold">
                  <Shield className="h-3 w-3 inline mr-1" />{profile.employeeCode}
                </span>
              )}
              {profile?.department && <span className="text-slate-500">{profile.department}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"><Mail className="h-3.5 w-3.5 inline mr-1" /> Email</label>
            <input type="email" value={profile?.email || user?.email || ""} disabled className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"><User className="h-3.5 w-3.5 inline mr-1" /> Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"><Phone className="h-3.5 w-3.5 inline mr-1" /> Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"><Shield className="h-3.5 w-3.5 inline mr-1" /> Role</label>
            <input type="text" value={roleLabel} disabled className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 px-3 py-2 text-sm text-slate-500 cursor-not-allowed capitalize" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
            <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19]/90 p-6 mb-6 text-slate-900 dark:text-white">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Change Password</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Update your login password.</p>
        {passwordSuccess && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Password updated!
          </div>
        )}
        {passwordError && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /> {passwordError}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 chars" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={handlePasswordChange} disabled={passwordSaving} className="bg-primary text-white font-bold text-xs gap-1">
            <Lock className="h-3.5 w-3.5" />{passwordSaving ? "Updating..." : "Save New Password"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <a href={backHref}><Button variant="outline" className="text-xs font-bold">Back</Button></a>
        <Button onClick={handleSave} disabled={saving} className="bg-primary text-white font-bold text-xs gap-1">
          <Save className="h-3.5 w-3.5" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </AppShell>
  );
}
