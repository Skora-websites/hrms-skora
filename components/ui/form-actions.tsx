"use client";

import * as React from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FormActionsProps {
  onCancel?: () => void;
  cancelLabel?: string;
  cancelIcon?: React.ReactNode;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  sticky?: boolean;
  error?: string | null;
  submitVariant?: ButtonProps["variant"];
  children?: React.ReactNode;
}

function FormActions({
  onCancel,
  cancelLabel = "Cancel",
  cancelIcon,
  submitLabel = "Save",
  submitIcon,
  loading,
  disabled,
  sticky = true,
  error,
  submitVariant = "primary",
  children,
}: FormActionsProps) {
  return (
    <div className="space-y-3 animate-section-in">
      {error && (
        <div className="p-3 text-sm text-danger bg-danger/10 rounded-lg border border-danger/20 animate-form-error flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div
        className={cn(
          "flex items-center justify-end gap-3",
          sticky && "sticky bottom-0 z-10 bg-card pt-4 pb-1 border-t border-border mt-2"
        )}
      >
        {children}
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            size="md"
          >
            {cancelIcon || <X className="h-4 w-4 mr-1.5" />}
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant={submitVariant}
          loading={loading}
          disabled={disabled}
          size="md"
        >
          {submitIcon || <Check className="h-4 w-4 mr-1.5" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export { FormActions };
