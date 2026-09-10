import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/70 dark:text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-dark dark:text-white placeholder:text-dark/70 dark:placeholder:text-gray-400 focus:border-primary focus:shadow-[0_3px_9px_rgba(94,114,228,0.1)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:opacity-50 transition-all duration-200",
            icon && "pl-10",
            error && "border-danger focus:border-danger focus:shadow-[0_3px_9px_rgba(245,54,92,0.1)]",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
