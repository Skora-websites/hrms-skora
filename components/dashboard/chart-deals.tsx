"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#5e72e4", "#11cdef", "#fb6340", "#2dce89", "#f5365c"];

interface DealsChartProps {
  dealsByStage?: { name: string; value: number; amount: number }[];
  loading?: boolean;
}

export function DealsChart({ dealsByStage = [], loading }: DealsChartProps) {
  const [view, setView] = useState<"count" | "percentage">("count");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const data = dealsByStage;
  const totalCount = data.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-dark text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs font-semibold">{item.name}</p>
          <p className="text-sm">
            {item.value} deals — ${(item.amount / 1000).toFixed(0)}K
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deal Pipeline</CardTitle>
            <p className="text-sm text-muted mt-1">Deals by stage</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant={view === "count" ? "primary" : "ghost"}
              size="xs"
              onClick={() => setView("count")}
            >
              Count
            </Button>
            <Button
              variant={view === "percentage" ? "primary" : "ghost"}
              size="xs"
              onClick={() => setView("percentage")}
            >
              %
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full min-h-[250px] flex items-center justify-center" style={{ height: mounted ? 250 : undefined }}>
            {mounted && (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted truncate">
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-dark dark:text-white">
                      {view === "count"
                        ? item.value
                        : `${((item.value / totalCount) * 100).toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
