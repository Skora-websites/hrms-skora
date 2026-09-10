import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold letter-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-65 btn-lift",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white shadow-sm",
        primary: "bg-gradient-primary text-white shadow-sm",
        success: "bg-gradient-success text-white shadow-sm",
        info: "bg-gradient-info text-white shadow-sm",
        warning: "bg-gradient-warning text-white shadow-sm",
        danger: "bg-gradient-danger text-white shadow-sm",
        dark: "bg-gradient-dark text-white shadow-sm",
        light: "bg-gradient-light text-dark shadow-sm",
        outline: "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-white",
        "outline-success": "border-2 border-success text-success bg-transparent hover:bg-success hover:text-white",
        "outline-danger": "border-2 border-danger text-danger bg-transparent hover:bg-danger hover:text-white",
        "outline-warning": "border-2 border-warning text-warning bg-transparent hover:bg-warning hover:text-white",
        ghost: "text-muted hover:text-dark hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-3 text-xs",
        sm: "h-9 px-5 text-xs",
        md: "h-10 px-5 text-sm",
        lg: "h-12 px-16 text-sm",
        xl: "h-14 px-20 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
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
          <span className="absolute inset-0 flex items-center justify-center">
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
