"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormActions } from "@/components/ui/form-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Search,
  ThumbsUp,
  Lightbulb,
  Heart,
  Users,
  Calendar,
  Clock,
  Plus,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

interface FeedbackItem {
  id?: string;
  _id?: string;
  fromUserId?: string;
  fromUser?: string;
  userId?: string;
  toUser?: string;
  type?: "praise" | "recognition" | "constructive" | "suggestion";
  feedbackType?: "praise" | "recognition" | "constructive" | "suggestion";
  message?: string;
  feedback?: string;
  context?: string;
  rating?: number;
  isAnonymous?: boolean;
  status: "pending" | "acknowledged" | "archived" | "active";
  createdAt?: string;
}

interface UserOption {
  id: string;
  displayName?: string;
  email?: string;
}

const feedbackTypeStyles: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  praise: { label: "Praise", icon: <ThumbsUp className="h-3.5 w-3.5" />, color: "bg-success/10 text-success border-success/20" },
  constructive: { label: "Constructive", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "bg-warning/10 text-warning border-warning/20" },
  suggestion: { label: "Suggestion", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary border-primary/20" },
  recognition: { label: "Recognition", icon: <Heart className="h-3.5 w-3.5" />, color: "bg-danger/10 text-danger border-danger/20" },
};

const statusColors: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  pending: "warning",
  active: "success",
  acknowledged: "primary",
  archived: "info",
};

const EMPTY_FEEDBACK_FORM = {
  userId: "",
  type: "praise" as const,
  rating: 5,
  feedback: "",
  context: "",
  isAnonymous: false,
};

export default function FeedbackPage() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(EMPTY_FEEDBACK_FORM);

  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedbackRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=feedback"),
        fetch("/api/hrm/v2/users?action=list"),
      ]);
      const feedbackData = feedbackRes.ok ? await feedbackRes.json() : { data: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
      const users = (usersData.data || []) as UserOption[];
      setFeedback(feedbackData.data || []);
      setUserOptions(users);
      setUserNames(
        Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id]))
      );
    } catch {
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nameOf = (id?: string) => (id ? userNames[id] || id : "—");

  const handleSendFeedback = async () => {
    if (!feedbackForm.userId || !feedbackForm.feedback.trim()) {
      toast.error("Validation error", "Please select a recipient and enter feedback message.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hrm/v2/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_feedback",
          userId: feedbackForm.userId,
          type: feedbackForm.type,
          rating: Number(feedbackForm.rating),
          feedback: feedbackForm.feedback,
          message: feedbackForm.feedback,
          context: feedbackForm.context,
          isAnonymous: feedbackForm.isAnonymous,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit feedback");
      }

      toast.success("Feedback shared", "Your 360 feedback has been delivered.");
      setShowAddDialog(false);
      setFeedbackForm(EMPTY_FEEDBACK_FORM);
      fetchData();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = feedback.filter((f) => {
    const q = search.toLowerCase();
    const message = (f.feedback || f.message || "").toLowerCase();
    const from = nameOf(f.fromUserId || f.fromUser).toLowerCase();
    const to = nameOf(f.userId || f.toUser).toLowerCase();
    const ctx = (f.context || "").toLowerCase();
    return !search || message.includes(q) || from.includes(q) || to.includes(q) || ctx.includes(q);
  });

  return (
    <AppShell title="Feedback">
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              message={t.message}
              description={t.description}
              onClose={() => toast.dismissToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </ToastPortal>

      <PageHeader
        title="Employee Feedback & Recognition"
        description="Share praise, constructive suggestions, and 360 peer feedback."
      >
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Give Feedback
        </Button>
      </PageHeader>

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
          <p className="text-foreground font-semibold text-lg">No feedback yet</p>
          <p className="text-sm text-muted mt-1">
            {search
              ? "Try adjusting your search query."
              : "Share praise or recognition with your colleagues by clicking 'Give Feedback'."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((item, idx) => {
            const id = item.id || item._id || `fb-${idx}`;
            const fType = item.type || item.feedbackType || "praise";
            const typeStyle = feedbackTypeStyles[fType] || feedbackTypeStyles.praise;
            const fromName = item.isAnonymous ? "Anonymous Colleague" : nameOf(item.fromUserId || item.fromUser);
            const toName = nameOf(item.userId || item.toUser);
            const messageText = item.feedback || item.message || "";

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {fromName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">
                          {fromName}
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
                        {item.rating && (
                          <span className="flex items-center text-xs font-semibold text-amber-500 gap-0.5">
                            <Star className="h-3 w-3 fill-amber-500" />
                            {item.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2 leading-relaxed">{messageText}</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Users className="h-3 w-3" /> To: <strong className="text-foreground">{toName}</strong>
                        </span>
                        {item.context && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {item.context}
                          </span>
                        )}
                        {item.createdAt && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={statusColors[item.status] || "info"} size="sm">
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Give Feedback Modal */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Give 360 Feedback</DialogTitle>
            <DialogDescription>Share recognition, praise, or constructive suggestions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSendFeedback(); }}>
            <div className="space-y-4">
              <FormSelect
                label="Recipient"
                options={[
                  { value: "", label: "Select colleague" },
                  ...userOptions.map((u) => ({ value: u.id, label: u.displayName || u.email || u.id })),
                ]}
                value={feedbackForm.userId}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, userId: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Feedback Category"
                  options={[
                    { value: "praise", label: "Praise & Thanks" },
                    { value: "recognition", label: "Recognition / Award" },
                    { value: "constructive", label: "Constructive Advice" },
                    { value: "suggestion", label: "Workflow Suggestion" },
                  ]}
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value as any })}
                />
                <FormInput
                  label="Rating (1 - 5)"
                  type="number"
                  min="1"
                  max="5"
                  value={feedbackForm.rating}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: Number(e.target.value) })}
                />
              </div>
              <FormInput
                label="Context / Project (optional)"
                placeholder="e.g. Q4 Sprint or Client Presentation"
                value={feedbackForm.context}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, context: e.target.value })}
              />
              <FormTextarea
                label="Feedback Message"
                placeholder="Write specific, helpful, and appreciative feedback..."
                value={feedbackForm.feedback}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                required
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonCheck"
                  checked={feedbackForm.isAnonymous}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, isAnonymous: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="anonCheck" className="text-xs text-muted cursor-pointer">
                  Send anonymously (your name won't be shown to the recipient)
                </label>
              </div>
              <FormActions
                onCancel={() => setShowAddDialog(false)}
                submitLabel="Send Feedback"
                loading={submitting}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
