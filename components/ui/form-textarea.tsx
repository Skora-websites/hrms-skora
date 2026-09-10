"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, label, error, helperText, id, value, placeholder, icon, showCount, maxLength, autoResize = true, ...props }, ref) => {
    const textareaId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasValue = value !== undefined && value !== "" && value !== null;
    const charCount = typeof value === "string" ? value.length : 0;
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRef = React.useCallback((node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    // Auto-resize
    React.useEffect(() => {
      if (autoResize && innerRef.current) {
        innerRef.current.style.height = "auto";
        innerRef.current.style.height = `${Math.max(innerRef.current.scrollHeight, 100)}px`;
      }
    }, [value, autoResize]);

    return (
      <div className="relative">
        <div className={cn("relative group", icon && "has-icon")}>
          {icon && (
            <div className={cn(
              "absolute left-3.5 top-4 z-10 transition-all duration-300 pointer-events-none",
              error ? "text-danger" : hasValue ? "text-primary" : "text-dark/70 dark:text-gray-400 group-focus-within:text-primary",
              hasValue && !error && "scale-105"
            )}>
              {icon}
            </div>
          )}
          <textarea
            id={textareaId}
            ref={setRef}
            value={value}
            placeholder=" "
            maxLength={maxLength}
            className={cn(
              "peer w-full rounded-xl border-2 bg-background text-sm text-dark dark:text-white",
              "transition-all duration-300 ease-out outline-none resize-none min-h-[100px]",
              "placeholder:text-transparent",
              "focus:border-[var(--color-primary,#5e72e4)] focus:shadow-[0_0_0_4px_var(--color-primary-alpha,rgba(94,114,228,0.1))]",
              "hover:border-gray-300 dark:hover:border-gray-500",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50",
              icon ? "pl-11" : "pl-4",
              "pr-4 pt-6 pb-3",
              hasValue && !error && !props.disabled && "border-l-[var(--color-primary,#5e72e4)]",
              error
                ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(245,54,92,0.1)] hover:border-danger"
                : "border-border",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {/* Floating Label */}
          <label
            htmlFor={textareaId}
            className={cn(
              "absolute left-4 top-3 text-xs transition-all duration-300 ease-out pointer-events-none select-none",
              "peer-placeholder-shown:text-sm peer-placeholder-shown:text-dark/70 dark:peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-4",
              "peer-focus:text-xs peer-focus:top-3 peer-focus:text-[var(--color-primary,#5e72e4)]",
              icon && "left-11",
              !icon && "left-4",
              error ? "text-danger peer-focus:text-danger" : hasValue ? "text-[var(--color-primary,#5e72e4)]/80" : "text-dark/70 dark:text-gray-400",
              !hasValue && "peer-placeholder-shown:top-4"
            )}
          >
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        </div>
        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs text-danger flex items-center gap-1 animate-form-error">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-dark/70 dark:text-gray-400">{helperText}</p>
            {showCount && maxLength && (
              <span className="text-xxs text-dark/70 dark:text-gray-400 transition-colors duration-200" style={charCount > maxLength * 0.85 ? { color: charCount >= maxLength ? 'var(--color-danger)' : 'var(--color-warning)' } : {}}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        {!helperText && showCount && maxLength && !error && (
          <div className="mt-1 flex items-center justify-end">
            <span className="text-xxs text-dark/70 dark:text-gray-400 transition-colors duration-200" style={charCount > maxLength * 0.85 ? { color: charCount >= maxLength ? 'var(--color-danger)' : 'var(--color-warning)' } : {}}>
              {charCount}/{maxLength}
            </span>
          </div>
        )}
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";

export { FormTextarea };
