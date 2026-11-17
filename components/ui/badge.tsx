import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs",
        primary: "bg-primary text-primary-foreground shadow-xs",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        danger: "bg-destructive text-destructive-foreground",
        outline: "border border-border text-foreground bg-transparent",
        subtle: "bg-primary/10 text-primary border border-primary/20",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
        "subtle-success": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
        "subtle-warning": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
        info: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30",
        "subtle-info": "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30",
        "subtle-danger": "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30",
        dark: "bg-gray-800 text-gray-100 dark:bg-gray-200 dark:text-gray-900",
        light: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        "outline-success": "border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-transparent",
        "outline-danger": "border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-transparent",
        "outline-warning": "border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-transparent",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
