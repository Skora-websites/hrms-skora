"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "full";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn("gap-2", className)}
      >
        {isDark ? (
          <>
            <Sun className="h-4 w-4" />
            <span>Light Mode</span>
          </>
        ) : (
          <>
            <Moon className="h-4 w-4" />
            <span>Dark Mode</span>
          </>
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
            "relative overflow-hidden",
            "hover:bg-amber-50 dark:hover:bg-indigo-950/40",
            "group",
            className
          )}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        >
          {/* Background glow effect on hover */}
          <span
            className={cn(
              "absolute inset-0 rounded-md transition-opacity duration-300",
              isDark
                ? "opacity-0 group-hover:opacity-100 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
                : "opacity-0 group-hover:opacity-100 bg-gradient-to-br from-amber-500/10 to-orange-500/5"
            )}
          />

          {/* Outer ring that rotates */}
          <span
            className={cn(
              "absolute inset-0.5 rounded-full border transition-all duration-500",
              isDark
                ? "border-indigo-400/20 group-hover:border-indigo-400/40 group-hover:scale-110"
                : "border-amber-400/20 group-hover:border-amber-400/40 group-hover:scale-110"
            )}
          />

          {/* Sun icon */}
          <Sun
            className={cn(
              "relative z-10 h-[18px] w-[18px] transition-all duration-300",
              "group-hover:scale-110",
              isDark
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100 text-amber-500 group-hover:text-amber-400"
            )}
          />

          {/* Moon icon */}
          <Moon
            className={cn(
              "absolute z-10 h-[18px] w-[18px] transition-all duration-300",
              "group-hover:scale-110",
              isDark
                ? "rotate-0 scale-100 opacity-100 text-indigo-400 group-hover:text-indigo-300"
                : "-rotate-90 scale-0 opacity-0"
            )}
          />

          {/* Ripple effect on click */}
          <span
            className={cn(
              "pointer-events-none absolute inset-0 rounded-md",
              "after:absolute after:inset-0 after:rounded-md after:opacity-0 after:transition-opacity after:duration-500",
              "active:after:opacity-100",
              isDark
                ? "after:bg-indigo-400/10"
                : "after:bg-amber-400/10"
            )}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]">
            {isDark ? "☀️" : "🌙"}
          </span>
          Switch to {isDark ? "Light" : "Dark"} Mode
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
