"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "primary" | "success" | "info" | "warning" | "danger" | "dark";
  trend?: "up" | "down";
  trendValue?: string;
  index?: number;
  gradient?: boolean;
  loading?: boolean;
}

const gradientMap = {
  primary: "bg-gradient-primary",
  success: "bg-gradient-success",
  info: "bg-gradient-info",
  warning: "bg-gradient-warning",
  danger: "bg-gradient-danger",
  dark: "bg-gradient-dark",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  trend,
  trendValue,
  index = 0,
  gradient = false,
  loading = false,
}: StatsCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/80 p-5 shadow-xs",
          gradient
            ? cn(gradientMap[color], "text-white")
            : "bg-card text-card-foreground"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2.5 flex-1">
            <Skeleton className={cn("h-4 w-24", gradient && "bg-white/30")} />
            <Skeleton className={cn("h-8 w-20", gradient && "bg-white/30")} />
            {subtitle && (
              <Skeleton className={cn("h-3 w-32", gradient && "bg-white/30")} />
            )}
          </div>
          <Skeleton className={cn("h-12 w-12 rounded-xl", gradient && "bg-white/30")} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        "rounded-2xl border border-border/80 p-5 shadow-xs hover:shadow-md hover:border-border transition-[box-shadow,border-color] duration-150",
        gradient
          ? cn(gradientMap[color], "text-white")
          : "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p
            className={cn(
              "text-xs font-medium",
              gradient ? "text-white/90" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-3xl font-extrabold tracking-tight truncate",
              gradient ? "text-white" : "text-foreground"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                "text-xs leading-normal font-medium",
                gradient ? "text-white/85" : "text-muted-foreground"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "icon-shape icon-shape-lg rounded-xl shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            gradient
              ? "bg-white/20 text-white"
              : cn(
                  color === "primary" && "bg-gradient-primary-subtle text-primary",
                  color === "success" && "bg-gradient-success-subtle text-emerald-600 dark:text-emerald-400",
                  color === "info" && "bg-gradient-info-subtle text-sky-600 dark:text-sky-400",
                  color === "warning" && "bg-gradient-warning-subtle text-amber-600 dark:text-amber-400",
                  color === "danger" && "bg-gradient-danger-subtle text-rose-600 dark:text-rose-400"
                )
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              gradient
                ? "bg-white/20 text-white"
                : trend === "up"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendValue}
          </span>
          <span className={cn("text-xs font-medium", gradient ? "text-white/85" : "text-muted-foreground")}>
            vs last month
          </span>
        </div>
      )}
    </motion.div>
  );
}
