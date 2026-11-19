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
              "absolute left-3.5 top-1/2 -translate-y-1/2 z-10 transition-colors duration-150 pointer-events-none",
              error ? "text-destructive" : hasValue ? "text-primary" : "text-muted-foreground group-focus-within:text-primary"
            )}>
              {icon}
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            value={value || ""}
            className={cn(
              "peer w-full h-11 rounded-xl border bg-background text-sm text-foreground",
              "transition-[border-color,box-shadow] duration-150 ease-out outline-none appearance-none cursor-pointer",
              "focus:border-primary focus:ring-1 focus:ring-primary/20",
              "hover:border-border/90",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50",
              icon ? "pl-11 pr-10" : "pl-4 pr-10",
              "pt-5 pb-1.5",
              hasValue && !error && !props.disabled && "border-l-primary",
              error
                ? "border-destructive focus:border-destructive hover:border-destructive"
                : "border-border",
              !hasValue && "text-transparent",
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-muted-foreground">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-foreground bg-background">
                {opt.label}
              </option>
            ))}
          </select>
          {/* Floating Label */}
          <label
            htmlFor={selectId}
            className={cn(
              "absolute left-4 text-xs top-2.5 -translate-y-0 transition-colors duration-150 ease-out pointer-events-none select-none",
              "peer-focus:text-primary",
              icon && "left-11",
              !icon && "left-4",
              error ? "text-destructive" : hasValue ? "text-primary" : "text-muted-foreground",
              !hasValue && "peer-placeholder-shown:text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-muted-foreground"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
          {/* Chevron Icon */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground transition-transform duration-150 motion-reduce:transition-none group-focus-within:text-primary group-focus-within:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-xs text-destructive flex items-center gap-1 motion-safe:animate-form-error">
            <svg aria-hidden="true" className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

export { FormSelect };
