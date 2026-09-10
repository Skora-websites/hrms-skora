"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Variants ────────────────────────────────────────────

const toastVariants = cva(
  "fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border p-4 shadow-lg max-w-sm animate-slide-up",
  {
    variants: {
      variant: {
        success: "bg-white dark:bg-gray-800 border-success/20 text-dark dark:text-white",
        error: "bg-white dark:bg-gray-800 border-danger/20 text-dark dark:text-white",
        warning: "bg-white dark:bg-gray-800 border-warning/20 text-dark dark:text-white",
        info: "bg-white dark:bg-gray-800 border-info/20 text-dark dark:text-white",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColorMap = {
  success: "text-success",
  error: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

// ── Toast Component ─────────────────────────────────────

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  message: string;
  description?: string;
  onClose?: () => void;
  autoClose?: number;
}

function Toast({
  className,
  variant = "info",
  message,
  description,
  onClose,
  autoClose = 4000,
  ...props
}: ToastProps) {
  const Icon = iconMap[variant || "info"];

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  return (
    <div
      className={cn(toastVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconColorMap[variant || "info"])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{message}</p>
        {description && (
          <p className="text-xs text-dark/70 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-dark/50 dark:text-gray-500 hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

Toast.displayName = "Toast";

// ── Portal ──────────────────────────────────────────────

interface ToastPortalProps {
  children: React.ReactNode;
}

function ToastPortal({ children }: ToastPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <>{children}</>;
}

export { Toast, ToastPortal, toastVariants };
