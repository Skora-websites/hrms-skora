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
              "absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-colors duration-150",
              error ? "text-destructive" : hasValue ? "text-primary" : "text-muted-foreground group-focus-within:text-primary"
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
              "peer w-full h-11 rounded-xl border bg-background px-4 text-sm text-foreground",
              "transition-[border-color,box-shadow] duration-150 ease-out outline-none",
              "placeholder:text-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50",
              // Hover
              "hover:border-border/90",
              // Focus
              "focus:border-primary focus:ring-1 focus:ring-primary/20",
              // Filled state
              hasValue && !error && !props.disabled && "border-l-primary",
              // Icon padding
              icon && "pl-11",
              endIcon && "pr-11",
              // Floating label padding
              floating && "pt-5 pb-1.5",
              // Error state
              error
                ? "border-destructive focus:border-destructive hover:border-destructive"
                : "border-border",
              // Success state
              success && !error && "border-emerald-500 focus:border-emerald-500",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
            {...props}
          />
          {/* End icon (e.g. password toggle, clear button) */}
          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground">
              {endIcon}
            </div>
          )}
          {/* Floating Label */}
          {floating && (
            <label
              htmlFor={inputId}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-colors duration-150 ease-out pointer-events-none select-none",
                "peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2",
                "peer-focus:text-xs peer-focus:top-2.5 peer-focus:-translate-y-0 peer-focus:text-primary",
                hasValue && "text-xs top-2.5 -translate-y-0",
                icon && "peer-placeholder-shown:left-11 peer-focus:left-11 left-11",
                !icon && "peer-placeholder-shown:left-4 peer-focus:left-4",
                error ? "peer-focus:text-destructive text-destructive" : hasValue ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
              {props.required && <span className="text-destructive ml-0.5">*</span>}
            </label>
          )}
        </div>
        {/* Error message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-destructive flex items-center gap-1 motion-safe:animate-form-error">
            <svg aria-hidden="true" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <p id={`${inputId}-help`} className="text-xs text-muted-foreground">{helperText}</p>
            {showCount && maxLength && (
              <span className="text-xs text-muted-foreground transition-colors duration-150" style={charCount > maxLength * 0.85 ? { color: charCount >= maxLength ? 'var(--color-danger)' : 'var(--color-warning)' } : {}}>
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        {!helperText && showCount && maxLength && !error && (
          <div className="mt-1 flex items-center justify-end">
            <span className="text-xs text-muted-foreground transition-colors duration-150" style={charCount > maxLength * 0.85 ? { color: charCount >= maxLength ? 'var(--color-danger)' : 'var(--color-warning)' } : {}}>
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
