"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  floating?: boolean;
  showCount?: boolean;
  maxLength?: number;
  success?: boolean;
  endIcon?: React.ReactNode;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, icon, error, helperText, id, value, placeholder, floating = true, showCount, maxLength, success, endIcon, ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasValue = value !== undefined && value !== "" && value !== null;
    const charCount = typeof value === "string" ? value.length : 0;

    return (
      <div className="relative">
        <div className={cn("relative group", icon && "has-icon")}>
          {icon && (
            <div className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-all duration-300",
              error ? "text-danger" : hasValue ? "text-primary" : "text-dark/70 dark:text-gray-400 group-focus-within:text-primary",
              hasValue && !error && "scale-105"
            )}>
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            value={value}
            placeholder={floating ? " " : placeholder || `Enter ${label.toLowerCase()}`}
            maxLength={maxLength}
            className={cn(
              // Base styles
              "peer w-full h-12 rounded-xl border-2 bg-background px-4 text-sm text-dark dark:text-white",
              "transition-all duration-300 ease-out outline-none",
              "placeholder:text-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50",
              // Hover
              "hover:border-gray-300 dark:hover:border-gray-500",
              // Focus — uses CSS var so it follows theme color
              "focus:border-[var(--color-primary,#5e72e4)] focus:shadow-[0_0_0_4px_var(--color-primary-alpha,rgba(94,114,228,0.1))]",
              // Filled state — subtle accent on left border
              hasValue && !error && !props.disabled && "border-l-[var(--color-primary,#5e72e4)]",
              // Icon padding
              icon && "pl-11",
              endIcon && "pr-11",
              // Floating label padding
              floating && "pt-5 pb-1.5",
              // Error state
              error
                ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(245,54,92,0.1)] hover:border-danger"
                : "border-border",
              // Success state
              success && !error && "border-success focus:border-success focus:shadow-[0_0_0_4px_rgba(45,206,137,0.1)]",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
            {...props}
          />
          {/* End icon (e.g. password toggle, clear button) */}
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              {endIcon}
            </div>
          )}
          {/* Floating Label */}
          {floating && (
            <label
              htmlFor={inputId}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-all duration-300 ease-out pointer-events-none select-none",
                "peer-placeholder-shown:text-sm peer-placeholder-shown:text-dark/70 dark:peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2",
                "peer-focus:text-xs peer-focus:top-2.5 peer-focus:-translate-y-0 peer-focus:text-[var(--color-primary,#5e72e4)]",
                hasValue && "text-xs top-2.5 -translate-y-0",
                icon && "peer-placeholder-shown:left-11 peer-focus:left-11 left-11",
                !icon && "peer-placeholder-shown:left-4 peer-focus:left-4",
                error ? "peer-focus:text-danger" : "peer-focus:text-[var(--color-primary,#5e72e4)]",
                hasValue && !error && "text-[var(--color-primary,#5e72e4)]/80",
                error && "text-danger"
              )}
            >
              {label}
              {props.required && <span className="text-danger ml-0.5">*</span>}
            </label>
          )}
          {/* Filled indicator dot — hidden when endIcon is present */}
          {hasValue && !error && !success && !endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block h-1.5 w-1.5 rounded-full bg-[var(--color-primary,#5e72e4)] opacity-40" />
            </div>
          )}
        </div>
        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger flex items-center gap-1 animate-form-error">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {/* Helper text + char count */}
        {helperText && !error && (
          <div className="mt-1 flex items-center justify-between">
            <p id={`${inputId}-help`} className="text-xs text-dark/70 dark:text-gray-400">{helperText}</p>
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
FormInput.displayName = "FormInput";

export { FormInput };
