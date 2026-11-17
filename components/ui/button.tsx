import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        outline: "border border-border bg-background shadow-xs hover:bg-muted hover:text-foreground text-foreground",
        ghost: "hover:bg-muted hover:text-foreground text-muted-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        danger: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        success: "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700",
        warning: "bg-amber-600 text-white shadow-xs hover:bg-amber-700",
        info: "bg-sky-600 text-white shadow-xs hover:bg-sky-700",
        dark: "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900",
        light: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100",
        "outline-primary": "border border-primary text-primary bg-transparent hover:bg-primary/10",
        "outline-success": "border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-transparent hover:bg-emerald-500/10",
        "outline-danger": "border border-rose-500/50 text-rose-600 dark:text-rose-400 bg-transparent hover:bg-rose-500/10",
        "outline-warning": "border border-amber-500/50 text-amber-600 dark:text-amber-400 bg-transparent hover:bg-amber-500/10",
        link: "text-primary underline-offset-4 hover:underline !p-0 !h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1.5",
        sm: "h-8 px-3 text-xs rounded-md gap-1.5",
        md: "h-9 px-4 py-2 text-sm rounded-lg gap-2",
        lg: "h-10 px-5 text-sm rounded-lg gap-2",
        xl: "h-11 px-6 text-base rounded-xl gap-2.5",
        icon: "h-9 w-9 p-0 rounded-lg",
        "icon-sm": "h-8 w-8 p-0 rounded-md",
        "icon-xs": "h-7 w-7 p-0 rounded",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), loading && "relative !text-transparent")}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-foreground">
            <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
