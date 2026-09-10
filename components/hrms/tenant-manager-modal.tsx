'use client';

import { useState } from 'react';
import { Plus, Building2, User, Mail, Lock, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TenantManagerModalProps {
  onCreated?: () => void;
}

export function TenantManagerModal({ onCreated }: TenantManagerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    latitude: '28.6007594',
    longitude: '77.4319307',
    hrAdminName: '',
    hrAdminEmail: '',
    hrAdminPassword: 'password123',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setResetLink(null);

    try {
      const res = await fetch('/api/hrm/v2/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          subscriptionTier: 'pro',
          isActive: true,
          modulesEnabled: { pms: true, ats: false, payroll: true },
          officeLatitude: parseFloat(formData.latitude) || 28.6007594,
          officeLongitude: parseFloat(formData.longitude) || 77.4319307,
          assignedHrAdmin: formData.hrAdminEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create organization');
      }

      const data = await res.json();
      const invite = data.hrAdminInvite;

      let msg = `Organization "${formData.name}" created successfully!`;
      if (invite?.resetLink) {
        setResetLink(invite.resetLink);
        msg += ` HR Admin invite sent to ${invite.email}.`;
      }
      setSuccess(msg);

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
        setResetLink(null);
        onCreated?.();
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization & HR admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-1.5 transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Create Organization & HR Admin</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-slate-900 dark:text-white my-8">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Setup Organization & Assign HR Admin</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure tenant and create the lead HR Administrator</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg text-lg leading-none">
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
                {resetLink && (
                  <div className="mt-2 p-2 bg-slate-50 dark:bg-black/40 rounded-lg border border-gray-200 dark:border-white/10">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">🔐 Password Reset Link (share with HR Admin):</p>
                    <a href={resetLink} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline break-all font-mono">{resetLink}</a>
                    <p className="text-[10px] text-slate-500 mt-1">The HR Admin should click this link to set their own password for the first time.</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-3 bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">1. Organization Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. acme.com"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]"><MapPin className="h-3 w-3 inline mr-1" />Office Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 text-[11px]"><MapPin className="h-3 w-3 inline mr-1" />Office Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-black/30 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">2. Assigned HR Administrator</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium"><User className="h-3 w-3 inline mr-1" />HR Admin Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sarah Connor"
                      value={formData.hrAdminName}
                      onChange={(e) => setFormData({ ...formData, hrAdminName: e.target.value })}
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium"><Mail className="h-3 w-3 inline mr-1" />HR Admin Email</label>
                    <input
                      type="email"
                      placeholder="e.g. hr@acme.com"
                      value={formData.hrAdminEmail}
                      onChange={(e) => setFormData({ ...formData, hrAdminEmail: e.target.value })}
                      required
                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  A password reset link will be generated for the HR Admin to set their own password on first login.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Save & Provision Tenant'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
