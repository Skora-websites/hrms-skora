"use client";

import { motion } from "framer-motion";
import { Eye, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { Lead } from "@/types";

interface TopLeadsProps {
  leads?: Lead[];
  loading?: boolean;
}

export function TopLeads({ leads = [], loading }: TopLeadsProps) {
  const topLeads = leads
    .filter((l) => l.status !== "won" && l.status !== "lost")
    .slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40 mt-1" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
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
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active Leads</CardTitle>
            <p className="text-sm text-muted mt-1">Top active opportunities</p>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {topLeads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Eye}
                title="No active leads"
                description="Active leads will appear here once they are created"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <p className="font-semibold text-sm">{lead.name}</p>
                      <p className="text-xs text-muted">{lead.owner || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.company}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          lead.status === "new" || lead.status === "contacted" || lead.status === "qualified"
                            ? "subtle-info"
                            : lead.status === "proposal" || lead.status === "negotiation"
                            ? "subtle-warning"
                            : "subtle-success"
                        }
                        size="sm"
                      >
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatCurrency(lead.value ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={lead.probability ?? 0}
                          className="w-20 h-1.5"
                          indicatorClassName={
                            (lead.probability ?? 0) >= 70
                              ? "bg-gradient-success"
                              : (lead.probability ?? 0) >= 40
                              ? "bg-gradient-warning"
                              : "bg-gradient-info"
                          }
                        />
                        <span className="text-xs text-muted">{(lead.probability ?? 0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-xs">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
