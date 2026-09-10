"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { formatCompactNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface RevenueChartProps {
  monthlyRevenue?: number[];
  monthlyLeads?: number[];
  loading?: boolean;
}

export function RevenueChart({ monthlyRevenue, monthlyLeads, loading }: RevenueChartProps) {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<"6m" | "12m">("12m");
  const [mounted, setMounted] = useState(false);
  const isDark = theme === "dark";

  // Only render charts after mount to ensure container dimensions are available
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = months.map((month, i) => ({
    name: month,
    revenue: monthlyRevenue?.[i] || 0,
    leads: monthlyLeads?.[i] || 0,
  }));

  const filteredData = period === "6m" ? data.slice(-6) : data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs text-gray-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold">
              {entry.name === "revenue"
                ? `$${formatCompactNumber(entry.value)}`
                : `${entry.value} leads`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Overview</CardTitle>
            <p className="text-sm text-muted mt-1">Monthly revenue and lead generation</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={period === "6m" ? "primary" : "ghost"}
              size="xs"
              onClick={() => setPeriod("6m")}
            >
              6M
            </Button>
            <Button
              variant={period === "12m" ? "primary" : "ghost"}
              size="xs"
              onClick={() => setPeriod("12m")}
            >
              12M
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full min-h-[300px]" style={{ height: mounted ? 300 : undefined }}>
            {mounted && (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5e72e4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5e72e4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dce89" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2dce89" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(255,255,255,0.1)" : "#e9ecef"}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "#6c757d", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "#6c757d", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${formatCompactNumber(value)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#5e72e4"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  animationDuration={1000}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#2dce89"
                  strokeWidth={2}
                  fill="url(#leadsGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
