"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { getRelativeTime } from "@/lib/utils";
import type { Activity } from "@/types";

const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  task: CheckCircle2,
  deal: TrendingUp,
};

const activityColors: Record<string, string> = {
  call: "bg-gradient-info",
  email: "bg-gradient-primary",
  meeting: "bg-gradient-warning",
  note: "bg-gradient-dark",
  task: "bg-gradient-success",
  deal: "bg-gradient-success",
};

interface ActivityFeedProps {
  activities?: Activity[];
  loading?: boolean;
}

export function ActivityFeed({ activities = [], loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 py-2">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                icon={FileText}
                title="No recent activity"
                description="Activity from your team will appear here"
              />
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="space-y-0 px-4 pb-4">
                {activities.map((activity, index) => {
                  const Icon = activityIcons[activity.type] || FileText;
                  const color = activityColors[activity.type] || "bg-gradient-primary";

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex gap-3 py-3 border-b border-border/50 last:border-0"
                    >
                      <div
                        className={`icon-shape ${color} text-white shrink-0 mt-0.5`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-dark dark:text-white truncate">
                            {activity.title}
                          </p>
                          <span className="text-xxs text-muted whitespace-nowrap">
                            {getRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {activity.user && (
                            <span className="text-xxs text-muted">
                              {activity.user}
                            </span>
                          )}
                          {(activity.user && activity.relatedTo) && (
                            <span className="text-muted/30">·</span>
                          )}
                          {activity.relatedTo && (
                            <Badge variant="subtle" size="sm">
                              {activity.relatedTo}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
