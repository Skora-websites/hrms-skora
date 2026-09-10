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
          "rounded-xl border-0 shadow p-4",
          gradient
            ? cn(gradientMap[color], "text-white")
            : "bg-card text-card-foreground"
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className={cn("h-4 w-24", gradient && "bg-white/30")} />
            <Skeleton className={cn("h-8 w-20", gradient && "bg-white/30")} />
            {subtitle && (
              <Skeleton className={cn("h-3 w-32", gradient && "bg-white/30")} />
            )}
          </div>
          <Skeleton className={cn("h-12 w-12 rounded-lg", gradient && "bg-white/30")} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        "rounded-xl border-0 shadow p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        gradient
          ? cn(gradientMap[color], "text-white")
          : "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm font-semibold",
              gradient ? "text-white/80" : "text-muted"
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              gradient ? "text-white" : "text-dark dark:text-white"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={cn(
                "text-xs",
                gradient ? "text-white/60" : "text-muted"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "icon-shape icon-shape-lg",
            gradient
              ? "bg-white/20"
              : cn(
                  color === "primary" && "bg-gradient-primary-subtle",
                  color === "success" && "bg-gradient-success-subtle",
                  color === "info" && "bg-gradient-info-subtle",
                  color === "warning" && "bg-gradient-warning-subtle",
                  color === "danger" && "bg-gradient-danger-subtle"
                )
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              gradient ? "text-white" : `text-${color}`
            )}
          />
        </div>
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp
              className={cn("h-3.5 w-3.5", gradient ? "text-white" : "text-success")}
            />
          ) : (
            <TrendingDown
              className={cn("h-3.5 w-3.5", gradient ? "text-white" : "text-danger")}
            />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              gradient
                ? "text-white"
                : trend === "up"
                ? "text-success"
                : "text-danger"
            )}
          >
            {trendValue}
          </span>
          <span className={cn("text-xs", gradient ? "text-white/60" : "text-muted")}>
            vs last month
          </span>
        </div>
      )}
    </motion.div>
  );
}
