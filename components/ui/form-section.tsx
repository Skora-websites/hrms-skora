"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormSectionProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

function FormSection({
  title,
  description,
  icon,
  gradient,
  columns = 1,
  children,
  className,
  animate = true,
}: FormSectionProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        "transition-all duration-300 ease-out",
        gradient && "bg-gradient-to-br from-primary/5 to-primary/[0.02] border-primary/10",
        animate && "animate-section-in",
        className
      )}
    >
      {(title || description) && (
        <div className="flex items-start gap-3 mb-5">
          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h4 className="text-sm font-bold text-dark dark:text-white flex items-center gap-2">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-xs text-dark/70 dark:text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          columns === 2 && "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5",
          columns === 3 && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5",
          columns === 1 && "space-y-5"
        )}
      >
        {children}
      </div>
    </div>
  );
}

export { FormSection };
