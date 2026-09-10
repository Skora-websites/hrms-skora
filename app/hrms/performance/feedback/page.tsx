"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Search,
  ThumbsUp,
  Lightbulb,
  Heart,
  Users,
  Calendar,
  Clock,
} from "lucide-react";

interface FeedbackItem {
  _id: string;
  fromUser: string;
  toUser: string;
  type: "praise" | "recognition" | "constructive" | "suggestion";
  message: string;
  context?: string;
  isAnonymous: boolean;
  status: "pending" | "acknowledged" | "archived";
  createdAt: string;
}

const feedbackTypeStyles: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  praise: { label: "Praise", icon: <ThumbsUp className="h-3.5 w-3.5" />, color: "bg-success/10 text-success border-success/20" },
  constructive: { label: "Constructive", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning border-warning/20" },
  suggestion: { label: "Suggestion", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary border-primary/20" },
  recognition: { label: "Recognition", icon: <Heart className="h-3.5 w-3.5" />, color: "bg-danger/10 text-danger border-danger/20" },
};

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  pending: "warning",
  acknowledged: "primary",
  archived: "info",
};

export default function FeedbackPage() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/hrm/v2/feedback");
        if (res.ok) {
          const data = await res.json();
          setFeedback(data.data || []);
        }
      } catch {
        // Feedback API may not exist yet — show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const filtered = feedback.filter((f) => {
    const q = search.toLowerCase();
    return (
      !search ||
      f.message.toLowerCase().includes(q) ||
      f.fromUser.toLowerCase().includes(q) ||
      (f.context || "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Feedback">
      <PageHeader
        title="Employee Feedback"
        description="View praise, recognition, and constructive feedback from peers and managers."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search feedback..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-dark dark:text-white font-semibold text-lg">No feedback yet</p>
          <p className="text-sm text-muted mt-1">
            {search
              ? "Try adjusting your search."
              : "Feedback from peers and managers will appear here once shared."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => {
            const typeStyle = feedbackTypeStyles[item.type] || feedbackTypeStyles.praise;
            return (
              <div
                key={item._id}
                className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                      {item.fromUser.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-dark dark:text-white">
                          {item.fromUser}
                        </h3>
                        {item.isAnonymous && (
                          <span className="text-xs text-muted italic">(anonymous)</span>
                        )}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeStyle.color}`}
                        >
                          <span className="flex items-center gap-1">
                            {typeStyle.icon}
                            {typeStyle.label}
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-dark dark:text-white mt-2">{item.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users className="h-3 w-3" /> To: {item.toUser}
                        </span>
                        {item.context && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {item.context}
                          </span>
                        )}
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusColors[item.status]} size="sm">
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
