"use client";

import { useState } from "react";
import { Plus, Filter, MoreHorizontal, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDeals } from "@/hooks/use-api-data";
import { DEAL_STAGES } from "@/lib/constants";
import { formatCurrency, formatDate, getInitials, getAvatarColor } from "@/lib/utils";
import type { Deal } from "@/types";

export default function PipelinePage() {
  const { data: deals, loading, error } = useDeals();

  // Group deals by stage
  const pipelineData = deals?.reduce((acc, deal) => {
    const stage = deal.stage;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(deal);
    return acc;
  }, {} as Record<string, Deal[]>) || {};

  return (
    <AppShell title="Pipeline">
      <PageHeader
        title="Sales Pipeline"
        description="Manage deals through stages"
      >
        <Button variant="ghost" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button variant="primary" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Deal
        </Button>
      </PageHeader>

      {/* Pipeline columns */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div key={stage.value} className="min-w-[280px] w-[280px] shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <EmptyState
            icon={Filter}
            title="Failed to load pipeline"
            description={error}
          />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
          {DEAL_STAGES.map((stage, stageIndex) => {
            const dealsInStage = pipelineData[stage.value] || [];
            const stageTotal = dealsInStage.reduce((sum, d) => sum + d.value, 0);

            return (
              <div
                key={stage.value}
                className="min-w-[280px] w-[280px] shrink-0"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        stage.color === "info"
                          ? "bg-info"
                          : stage.color === "primary"
                          ? "bg-primary"
                          : stage.color === "warning"
                          ? "bg-warning"
                          : stage.color === "success"
                          ? "bg-success"
                          : "bg-danger"
                      }`}
                    />
                    <h6 className="text-dark dark:text-white font-semibold text-sm">
                      {stage.label}
                    </h6>
                    <Badge variant="subtle" size="sm">
                      {dealsInStage.length}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted font-semibold">
                    ${(stageTotal / 1000).toFixed(0)}K
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {dealsInStage.length === 0 ? (
                    <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-border bg-gray-50/50 dark:bg-gray-800/20">
                      <p className="text-xs text-muted">No deals</p>
                    </div>
                  ) : (
                    dealsInStage.map((deal, index) => (
                      <motion.div
                        key={deal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl border-0 shadow bg-card p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow"
                        draggable
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h6 className="text-sm font-semibold text-dark dark:text-white">
                            {deal.title}
                          </h6>
                          <Button variant="ghost" size="icon-xs" className="-mr-1 -mt-1">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-muted mb-3">{deal.company}</p>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-dark dark:text-white">
                            {formatCurrency(deal.value)}
                          </span>
                          <Badge
                            variant={
                              deal.probability >= 70
                                ? "subtle-success"
                                : deal.probability >= 40
                                ? "subtle-warning"
                                : "subtle-info"
                            }
                            size="sm"
                          >
                            {deal.probability}%
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback
                                style={{ background: getAvatarColor(deal.owner || "Unassigned") }}
                                className="text-xxs"
                              >
                                {getInitials(deal.owner || "Unassigned")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted">{deal.owner || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Calendar className="h-3 w-3" />
                            {formatDate(deal.closeDate)}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
