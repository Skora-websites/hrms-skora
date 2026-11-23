"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Variants ────────────────────────────────────────────

const toastVariants = cva(
  "fixed bottom-6 right-6 z-[100] flex items-start gap-3 rounded-xl border p-4 max-w-sm animate-slide-up",
  {
    variants: {
      variant: {
        success: "bg-white dark:bg-gray-800 border-success/20 text-foreground",
        error: "bg-white dark:bg-gray-800 border-danger/20 text-foreground",
        warning: "bg-white dark:bg-gray-800 border-warning/20 text-foreground",
        info: "bg-white dark:bg-gray-800 border-info/20 text-foreground",
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
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

Toast.displayName = "Toast";

// ── Portal ──────────────────────────────────────────────

import { useToast } from "@/hooks/use-toast";

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

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto max-w-sm w-full">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          message={t.message}
          description={t.description}
          onClose={() => dismissToast(t.id)}
        />
      ))}
    </div>
  );
}

export { Toast, ToastPortal, toastVariants };
