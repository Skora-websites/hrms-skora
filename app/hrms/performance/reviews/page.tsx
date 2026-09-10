"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Star,
  Search,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Mock Data ───────────────────────────────────────────

const MOCK_REVIEWS: any[] = [];

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "info",
  submitted: "warning",
  acknowledged: "primary",
  completed: "success",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-3.5 w-3.5" />,
  submitted: <TrendingUp className="h-3.5 w-3.5" />,
  acknowledged: <CheckCircle2 className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
};

function StarRating({ rating }: { rating: number }) {
  if (rating === 0) return <span className="text-xs text-muted">—</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-gray-200 dark:text-gray-700"
          }`}
        />
      ))}
      <span className="text-xs font-semibold text-dark dark:text-white ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_REVIEWS.filter((r) => {
    const q = search.toLowerCase();
    return !search || r.employee.toLowerCase().includes(q) || r.reviewer.toLowerCase().includes(q) || r.period.toLowerCase().includes(q);
  });

  return (
    <AppShell title="Reviews">
      <PageHeader title="Performance Reviews" description="View and manage performance review cycles and ratings." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search by employee, reviewer, or period..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Star className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No reviews found</p>
          <p className="text-sm text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-dark dark:text-white">{review.employee}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />{review.reviewer}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" />{review.period}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />Due {review.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StarRating rating={review.rating} />
                  <Badge variant={statusColors[review.status]} size="sm">
                    <span className="flex items-center gap-1">
                      {statusIcons[review.status]}
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </span>
                  </Badge>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
