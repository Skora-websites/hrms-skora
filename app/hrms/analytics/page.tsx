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
} from "recharts";
import { Download, Calendar, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { useDashboardStats } from "@/hooks/use-api-data";
import { formatCompactNumber } from "@/lib/utils";
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

  // Build monthly data from stats — real revenue only; cost/profit figures
  // are not recorded anywhere, so they are left out entirely.
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map((name, i) => ({
    name,
    revenue: stats?.monthlyRevenue?.[i] || 0,
  }));

  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);

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
                <p className="text-xs text-muted font-semibold">Total Revenue (YTD)</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  ${formatCompactNumber(totalRevenue)}
                </p>
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
                <p className="text-xs text-muted font-semibold">Deals Won</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  {stats?.dealsByStage?.find((s: any) => s.name === "Closed Won")?.value ?? 0}
                </p>
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
                <p className="text-xs text-muted font-semibold">Active Leads</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  {stats?.activeLeads ?? 0}
                </p>
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
                <p className="text-xs text-muted font-semibold">Conversion Rate</p>
                <p className="text-2xl font-bold text-dark dark:text-white mt-1">
                  {stats?.conversionRate ?? 0}%
                </p>
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
                <CardTitle>Monthly Revenue</CardTitle>
                <p className="text-sm text-muted mt-1">
                  Monthly revenue by month
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
                    </BarChart>
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
          </div>
        </>
      )}
    </AppShell>
  );
}
