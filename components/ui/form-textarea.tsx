"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  showCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
}

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, label, icon, error, helperText, id, value, showCount, maxLength, autoResize = false, ...props }, ref) => {
    const textareaId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasValue = value !== undefined && value !== "" && value !== null;
    const charCount = typeof value === "string" ? value.length : 0;
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    // Merge refs
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
              "absolute left-3.5 top-4 z-10 transition-colors duration-150 pointer-events-none",
              error ? "text-destructive" : hasValue ? "text-primary" : "text-muted-foreground group-focus-within:text-primary"
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
              "peer w-full rounded-xl border bg-background text-sm text-foreground",
              "transition-[border-color,box-shadow] duration-150 ease-out outline-none resize-none min-h-[100px]",
              "placeholder:text-transparent",
              "focus:border-primary focus:ring-1 focus:ring-primary/20",
              "hover:border-border/90",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50",
              icon ? "pl-11" : "pl-4",
              "pr-4 pt-6 pb-3",
              hasValue && !error && !props.disabled && "border-l-primary",
              error
                ? "border-destructive focus:border-destructive hover:border-destructive"
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
              "absolute left-4 top-3 text-xs transition-colors duration-150 ease-out pointer-events-none select-none",
              "peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted-foreground peer-placeholder-shown:top-4",
              "peer-focus:text-xs peer-focus:top-3 peer-focus:text-primary",
              icon && "left-11",
              !icon && "left-4",
              error ? "text-destructive peer-focus:text-destructive" : hasValue ? "text-primary" : "text-muted-foreground",
              !hasValue && "peer-placeholder-shown:top-4"
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
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
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{helperText}</p>
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
FormTextarea.displayName = "FormTextarea";

export { FormTextarea };
