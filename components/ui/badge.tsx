import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-2xs",
        primary: "bg-primary text-primary-foreground shadow-2xs",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        danger: "bg-destructive text-destructive-foreground",
        outline: "border border-border/80 text-foreground bg-transparent",
        subtle: "bg-primary/10 text-primary border border-primary/20",
        success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
        "subtle-success": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
        warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25",
        "subtle-warning": "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25",
        info: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25",
        "subtle-info": "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25",
        "subtle-danger": "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25",
        dark: "bg-gray-800 text-gray-100 dark:bg-gray-200 dark:text-gray-900",
        light: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        "outline-success": "border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-transparent",
        "outline-danger": "border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-transparent",
        "outline-warning": "border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-transparent",
      },
      size: {
        sm: "text-[11px] px-2.5 py-0.5 leading-none",
        md: "text-xs px-3 py-1 leading-tight",
        lg: "text-sm px-3.5 py-1.5 leading-normal",
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
