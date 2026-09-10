"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Download, Calendar, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { useDashboardStats } from "@/hooks/use-api-data";
import { formatCurrency, formatCompactNumber } from "@/lib/utils";
import { ReportGenerator } from "@/components/analytics/report-generator";

const sourceColors = ["#5e72e4", "#2dce89", "#11cdef", "#fb6340", "#f5365d"];

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: stats, loading } = useDashboardStats();
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="text-xs text-gray-300">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} className="text-sm font-bold">
              {entry.name}: ${formatCompactNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Build monthly data from stats
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map((name, i) => ({
    name,
    revenue: stats?.monthlyRevenue?.[i] || 0,
    costs: 0, // We don't store costs in Firestore, default to estimated 60%
    profit: stats?.monthlyRevenue?.[i] ? Math.round(stats.monthlyRevenue[i] * 0.4) : 0,
  }));

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = monthlyData.reduce((s, m) => s + m.costs, 0);
  const totalProfit = monthlyData.reduce((s, m) => s + m.profit, 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";

  return (
    <AppShell title="Analytics">
      <PageHeader
        title="Analytics"
        description="Detailed insights and performance metrics"
      >
        <Button variant="ghost" size="sm" onClick={() => setShowReportGenerator(true)}>
          <FileText className="h-4 w-4 mr-1" />
          Generate Report
        </Button>
        <Button variant="ghost" size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          This Year
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowReportGenerator(true)}>
          <Download className="h-4 w-4 mr-1" />
          Export Report
        </Button>
      </PageHeader>

      {/* Report Generator Modal */}
      <ReportGenerator
        open={showReportGenerator}
        onOpenChange={setShowReportGenerator}
        stats={stats}
        statsLoading={loading}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-5 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted font-semibold">Total Revenue</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  ${formatCompactNumber(totalRevenue)}
                </p>
                <Badge variant="subtle-success" size="sm" className="mt-2">
                  +18.3% YoY
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-5 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted font-semibold">Total Costs</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  ${formatCompactNumber(totalCosts)}
                </p>
                <Badge variant="subtle-warning" size="sm" className="mt-2">
                  +12.1% YoY
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-28 mb-2" />
                <Skeleton className="h-5 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted font-semibold">Net Profit</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  ${formatCompactNumber(totalProfit)}
                </p>
                <Badge variant="subtle-success" size="sm" className="mt-2">
                  +24.7% YoY
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            {loading ? (
              <>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-5 w-16" />
              </>
            ) : (
              <>
                <p className="text-xs text-muted font-semibold">Profit Margin</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  {profitMargin}%
                </p>
                <Badge variant="subtle-info" size="sm" className="mt-2">
                  +2.4% vs Q1
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-56 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full rounded-lg" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-48 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Revenue vs Costs Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Costs</CardTitle>
                <p className="text-sm text-muted mt-1">
                  Monthly comparison of revenue and costs
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <defs>
                        <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5e72e4" stopOpacity={1} />
                          <stop offset="100%" stopColor="#825ee4" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="costsBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f5365c" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#f56036" stopOpacity={0.6} />
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
                        tickFormatter={(v) => `$${formatCompactNumber(v)}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="revenue"
                        fill="url(#revenueBar)"
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      />
                      <Bar
                        dataKey="costs"
                        fill="url(#costsBar)"
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <p className="text-sm text-muted mt-1">
                  Monthly net profit overview
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dce89" stopOpacity={0.3} />
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
                        tickFormatter={(v) => `$${formatCompactNumber(v)}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#2dce89"
                        strokeWidth={3}
                        dot={{ fill: "#2dce89", r: 4 }}
                        activeDot={{ r: 6 }}
                        fill="url(#profitGradient)"
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leads by Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Source</CardTitle>
                <p className="text-sm text-muted mt-1">
                  Distribution of lead acquisition channels
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats?.leadsBySource || []}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(255,255,255,0.1)" : "#e9ecef"}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "#6c757d", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: isDark ? "rgba(255,255,255,0.6)" : "#6c757d", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? "#1a2332" : "#fff",
                          border: "none",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#5e72e4"
                        radius={[0, 4, 4, 0]}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <p className="text-sm text-muted mt-1">
                  Important performance indicators
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Customer Acquisition Cost", value: "$1,240", trend: "down", change: "-8.3%" },
                  { label: "Avg. Deal Size", value: "$42,500", trend: "up", change: "+15.2%" },
                  { label: "Sales Cycle Length", value: "45 days", trend: "down", change: "-12.5%" },
                  { label: "Customer Lifetime Value", value: "$185,000", trend: "up", change: "+22.1%" },
                  { label: "Churn Rate", value: "2.4%", trend: "down", change: "-0.8%" },
                  { label: "NPS Score", value: "72", trend: "up", change: "+5 pts" },
                ].map((metric, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm text-muted">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-dark dark:text-white">
                        {metric.value}
                      </span>
                      <Badge
                        variant={metric.trend === "up" ? "subtle-success" : "subtle-danger"}
                        size="sm"
                      >
                        {metric.change}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
