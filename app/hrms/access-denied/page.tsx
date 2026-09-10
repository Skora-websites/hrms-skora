"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md text-center animate-section-in">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-danger shadow-lg shadow-danger/25 mb-6">
          <ShieldAlert className="h-10 w-10 text-white" />
        </div>

        {/* Status code */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-danger/10 border border-danger/20 text-danger text-xs font-semibold mb-4">
          <Lock className="h-3 w-3" />
          403 — ACCESS DENIED
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-dark dark:text-white tracking-tight mb-2">
          You don&apos;t have access
        </h1>

        {/* Description */}
        <p className="text-sm text-muted leading-relaxed mb-2 max-w-sm mx-auto">
          This area requires a specific role or permission level that your account doesn&apos;t have.
          If you believe this is a mistake, please contact your administrator.
        </p>

        {/* Error hint */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs text-muted">
            Need a higher role level to access this resource
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/hrms">
            <Button variant="primary" className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/hrms/login">
            <Button variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sign in as different user
            </Button>
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-xs text-muted/60">
          Contact your Super Admin to request the necessary permissions
        </p>
      </div>
    </div>
  );
}
