"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "minimal";
}

export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "minimal") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={cn(
          "h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      >
        {isDark ? (
          <Sun className="h-4 w-4 motion-safe:transition-transform duration-200 motion-reduce:transition-none" />
        ) : (
          <Moon className="h-4 w-4 motion-safe:transition-transform duration-200 motion-reduce:transition-none" />
        )}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={cn(
            "relative text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50",
            className
          )}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          {/* Sun icon */}
          <Sun
            className={cn(
              "h-4 w-4 motion-safe:transition-[transform,opacity] duration-200 motion-reduce:transition-none",
              isDark
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100 text-amber-500"
            )}
          />

          {/* Moon icon */}
          <Moon
            className={cn(
              "absolute h-4 w-4 motion-safe:transition-[transform,opacity] duration-200 motion-reduce:transition-none",
              isDark
                ? "rotate-0 scale-100 opacity-100 text-sky-400"
                : "-rotate-90 scale-0 opacity-0"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <span>Switch to {isDark ? "light" : "dark"} mode</span>
      </TooltipContent>
    </Tooltip>
  );
}
