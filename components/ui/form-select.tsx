"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label: string;
  options: FormSelectOption[];
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, label, options, icon, error, helperText, id, value, placeholder, ...props }, ref) => {
    const selectId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasValue = value !== undefined && value !== "" && value !== null;

    return (
      <div className="relative">
        <div className={cn("relative group", icon && "has-icon")}>
          {icon && (
            <div className={cn(
              "absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-all duration-300 pointer-events-none",
              error ? "text-danger" : hasValue ? "text-primary" : "text-dark/70 dark:text-gray-400 group-focus-within:text-primary",
              hasValue && !error && "scale-105"
            )}>
              {icon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            value={value || ""}
            className={cn(
              "peer w-full h-12 rounded-xl border-2 bg-background text-sm text-dark dark:text-white",
              "transition-all duration-300 ease-out outline-none appearance-none cursor-pointer",
              "focus:border-[var(--color-primary,#5e72e4)] focus:shadow-[0_0_0_4px_var(--color-primary-alpha,rgba(94,114,228,0.1))]",
              "hover:border-gray-300 dark:hover:border-gray-500",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800/50",
              icon ? "pl-11 pr-10" : "pl-4 pr-10",
              "pt-5 pb-1.5",
              hasValue && !error && !props.disabled && "border-l-[var(--color-primary,#5e72e4)]",
              error
                ? "border-danger focus:border-danger focus:shadow-[0_0_0_4px_rgba(245,54,92,0.1)] hover:border-danger"
                : "border-border",
              !hasValue && "text-transparent",
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-dark/70">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-dark dark:text-white bg-background">
                {opt.label}
              </option>
            ))}
          </select>
          {/* Floating Label */}
          <label
            htmlFor={selectId}
            className={cn(
              "absolute left-4 text-xs top-2.5 -translate-y-0 transition-all duration-300 ease-out pointer-events-none select-none",
              "peer-focus:text-[var(--color-primary,#5e72e4)]",
              icon && "left-11",
              !icon && "left-4",
              error ? "text-danger" : hasValue ? "text-[var(--color-primary,#5e72e4)]/80" : "text-dark/70 dark:text-gray-400",
              !hasValue && "peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-dark/70 dark:peer-placeholder-shown:text-gray-400"
            )}
          >
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
          {/* Chevron Icon — animated rotation on focus */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-dark/70 dark:text-gray-400 transition-all duration-300 group-focus-within:text-[var(--color-primary,#5e72e4)] group-focus-within:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </div>
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
          <p className="mt-1.5 text-xs text-dark/70 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

export { FormSelect };
