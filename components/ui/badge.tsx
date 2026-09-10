import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[0.45rem] px-[0.9em] py-[0.55em] text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white",
        primary: "bg-gradient-primary text-white",
        success: "bg-gradient-success text-white",
        info: "bg-gradient-info text-white",
        warning: "bg-gradient-warning text-white",
        danger: "bg-gradient-danger text-white",
        dark: "bg-gradient-dark text-white",
        light: "bg-gradient-light text-dark",
        outline: "border border-primary text-primary bg-transparent",
        "outline-success": "border border-success text-success bg-transparent",
        "outline-danger": "border border-danger text-danger bg-transparent",
        "outline-warning": "border border-warning text-warning bg-transparent",
        subtle: "bg-primary/10 text-primary",
        "subtle-success": "bg-success/10 text-success",
        "subtle-warning": "bg-warning/10 text-warning",
        "subtle-danger": "bg-danger/10 text-danger",
        "subtle-info": "bg-info/10 text-info",
      },
      size: {
        sm: "text-xxs px-[0.6em] py-[0.3em]",
        md: "text-xs px-[0.9em] py-[0.55em]",
        lg: "text-sm px-[1em] py-[0.6em]",
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
