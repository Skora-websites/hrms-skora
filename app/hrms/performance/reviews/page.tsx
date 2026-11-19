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
  Star,
  Search,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  TrendingUp,
  Plus,
  Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";

// ── Types ───────────────────────────────────────────────

interface ReviewScore {
  category: string;
  score: number;
  comments?: string;
}

interface ReviewItem {
  id: string;
  userId: string;
  reviewerId: string;
  reviewType?: "self" | "manager" | "peer" | "360";
  period: string;
  overallRating: number;
  status: "draft" | "submitted" | "acknowledged" | "completed";
  periodStart?: string;
  periodEnd?: string;
  scores?: ReviewScore[];
  strengths?: string;
  areasForImprovement?: string;
  managerComments?: string;
  employeeComments?: string;
}

interface UserOption {
  id: string;
  displayName?: string;
  email?: string;
}

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
  if (!rating) return <span className="text-xs text-muted">N/A</span>;
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
      <span className="text-xs font-semibold text-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

const EMPTY_REVIEW_FORM = {
  userId: "",
  reviewType: "manager",
  period: "quarterly",
  periodStart: new Date().toISOString().split("T")[0],
  periodEnd: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
  overallRating: 4,
  qualityScore: 4,
  productivityScore: 4,
  teamworkScore: 4,
  leadershipScore: 4,
  strengths: "",
  areasForImprovement: "",
  managerComments: "",
};

export default function ReviewsPage() {
  const { user: currentUser } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);

  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [editRating, setEditRating] = useState(4);
  const [editStatus, setEditStatus] = useState<ReviewItem["status"]>("submitted");
  const [editManagerComments, setEditManagerComments] = useState("");
  const [editStrengths, setEditStrengths] = useState("");
  const [editImprovements, setEditImprovements] = useState("");

  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsRes, usersRes] = await Promise.all([
        fetch("/api/hrm/v2/performance?type=reviews"),
        fetch("/api/hrm/v2/users?action=list"),
      ]);
      const reviewsData = reviewsRes.ok ? await reviewsRes.json() : { data: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { data: [] };
      const users = (usersData.data || []) as UserOption[];
      setReviews(reviewsData.data || []);
      setUserOptions(users);
      setUserNames(
        Object.fromEntries(users.map((u) => [u.id, u.displayName || u.email || u.id]))
      );
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nameOf = (id: string) => userNames[id] || id || "N/A";

  const handleCreateReview = async () => {
    if (!reviewForm.userId) {
      toast.error("Validation error", "Please select an employee to review.");
      return;
    }
    setSubmitting(true);
    try {
      const scores: ReviewScore[] = [
        { category: "Quality", score: Number(reviewForm.qualityScore) },
        { category: "Productivity", score: Number(reviewForm.productivityScore) },
        { category: "Teamwork", score: Number(reviewForm.teamworkScore) },
        { category: "Leadership", score: Number(reviewForm.leadershipScore) },
      ];
      const res = await fetch("/api/hrm/v2/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_review",
          userId: reviewForm.userId,
          reviewerId: currentUser?.id,
          reviewType: reviewForm.reviewType,
          period: reviewForm.period,
          periodStart: reviewForm.periodStart,
          periodEnd: reviewForm.periodEnd,
          overallRating: Number(reviewForm.overallRating),
          scores,
          strengths: reviewForm.strengths,
          areasForImprovement: reviewForm.areasForImprovement,
          managerComments: reviewForm.managerComments,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create review");
      }

      toast.success("Review created", "Performance review started successfully.");
      setShowCreateDialog(false);
      setReviewForm(EMPTY_REVIEW_FORM);
      fetchData();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to create review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEvaluate = (review: ReviewItem) => {
    setSelectedReview(review);
    setEditRating(review.overallRating || 4);
    setEditStatus(review.status);
    setEditManagerComments(review.managerComments || "");
    setEditStrengths(review.strengths || "");
    setEditImprovements(review.areasForImprovement || "");
  };

  const handleUpdateReview = async () => {
    if (!selectedReview) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/hrm/v2/performance?id=${selectedReview.id}&type=review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating: Number(editRating),
          status: editStatus,
          managerComments: editManagerComments,
          strengths: editStrengths,
          areasForImprovement: editImprovements,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update review");
      }

      toast.success("Review updated", "Performance evaluation saved successfully.");
      setSelectedReview(null);
      fetchData();
    } catch (e: any) {
      toast.error("Error", e.message || "Failed to update review");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const employee = nameOf(r.userId).toLowerCase();
    const reviewer = nameOf(r.reviewerId).toLowerCase();
    return !search || employee.includes(q) || reviewer.includes(q) || (r.period || "").toLowerCase().includes(q);
  });

  return (
    <AppShell title="Reviews">
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
        title="Performance Reviews"
        description="View, initiate, and evaluate performance review cycles and ratings."
      >
        <Button className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Start Review
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search by employee, reviewer, or period..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted">Loading reviews...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Star className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-foreground font-semibold text-lg">No reviews found</p>
          <p className="text-sm text-muted mt-1">Start a review to begin tracking employee evaluations.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{nameOf(review.userId)}</h3>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" /> Reviewer: {nameOf(review.reviewerId)}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Cycle: {review.period.replace("_", " ")}
                      </span>
                      {review.reviewType && (
                        <span className="text-xs text-muted capitalize">
                          Type: {review.reviewType}
                        </span>
                      )}
                      {review.periodEnd && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Ends: {review.periodEnd}
                        </span>
                      )}
                    </div>
                    {review.managerComments && (
                      <p className="text-xs text-muted mt-2 italic line-clamp-1">
                        "{review.managerComments}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StarRating rating={review.overallRating} />
                  <Badge variant={statusColors[review.status] || "info"} size="sm">
                    <span className="flex items-center gap-1">
                      {statusIcons[review.status]}
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </span>
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEvaluate(review)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Evaluate
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Start Review Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Performance Review</DialogTitle>
            <DialogDescription>Initialize a new performance review evaluation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateReview(); }}>
            <div className="space-y-4">
              <FormSelect
                label="Employee to Review"
                options={[
                  { value: "", label: "Select employee" },
                  ...userOptions.map((u) => ({ value: u.id, label: u.displayName || u.email || u.id })),
                ]}
                value={reviewForm.userId}
                onChange={(e) => setReviewForm({ ...reviewForm, userId: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Review Cycle"
                  options={[
                    { value: "monthly", label: "Monthly" },
                    { value: "quarterly", label: "Quarterly" },
                    { value: "half_yearly", label: "Half Yearly" },
                    { value: "yearly", label: "Yearly" },
                  ]}
                  value={reviewForm.period}
                  onChange={(e) => setReviewForm({ ...reviewForm, period: e.target.value })}
                />
                <FormSelect
                  label="Review Type"
                  options={[
                    { value: "manager", label: "Manager Review" },
                    { value: "peer", label: "Peer Review" },
                    { value: "self", label: "Self Review" },
                    { value: "360", label: "360 Review" },
                  ]}
                  value={reviewForm.reviewType}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewType: e.target.value })}
                />
              </div>

              <div className="p-3 bg-muted/20 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-foreground">Category Scores (1 - 5)</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Quality of Work"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={reviewForm.qualityScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, qualityScore: Number(e.target.value) })}
                  />
                  <FormInput
                    label="Productivity"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={reviewForm.productivityScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, productivityScore: Number(e.target.value) })}
                  />
                  <FormInput
                    label="Teamwork & Collab"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={reviewForm.teamworkScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, teamworkScore: Number(e.target.value) })}
                  />
                  <FormInput
                    label="Leadership / Ownership"
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={reviewForm.leadershipScore}
                    onChange={(e) => setReviewForm({ ...reviewForm, leadershipScore: Number(e.target.value) })}
                  />
                </div>
                <FormInput
                  label="Overall Rating (1 - 5)"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={reviewForm.overallRating}
                  onChange={(e) => setReviewForm({ ...reviewForm, overallRating: Number(e.target.value) })}
                />
              </div>

              <FormTextarea
                label="Strengths"
                placeholder="Key accomplishments, high impact areas..."
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
              />

              <FormTextarea
                label="Areas for Improvement"
                placeholder="Specific growth opportunities or skill gaps..."
                value={reviewForm.areasForImprovement}
                onChange={(e) => setReviewForm({ ...reviewForm, areasForImprovement: e.target.value })}
              />

              <FormTextarea
                label="Manager Comments"
                placeholder="Overall summary or guidance..."
                value={reviewForm.managerComments}
                onChange={(e) => setReviewForm({ ...reviewForm, managerComments: e.target.value })}
              />

              <FormActions
                onCancel={() => setShowCreateDialog(false)}
                submitLabel="Start Review"
                loading={submitting}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Evaluate / Edit Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Evaluate Performance Review</DialogTitle>
            <DialogDescription>
              Update ratings, comments, and lifecycle status for {selectedReview ? nameOf(selectedReview.userId) : ""}.
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateReview(); }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Overall Rating (1 - 5)"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={editRating}
                    onChange={(e) => setEditRating(Number(e.target.value))}
                    required
                  />
                  <FormSelect
                    label="Status"
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "submitted", label: "Submitted" },
                      { value: "acknowledged", label: "Acknowledged" },
                      { value: "completed", label: "Completed" },
                    ]}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  />
                </div>

                <FormTextarea
                  label="Strengths"
                  value={editStrengths}
                  onChange={(e) => setEditStrengths(e.target.value)}
                  placeholder="Key positive achievements..."
                />

                <FormTextarea
                  label="Areas for Improvement"
                  value={editImprovements}
                  onChange={(e) => setEditImprovements(e.target.value)}
                  placeholder="Focus areas for coming cycle..."
                />

                <FormTextarea
                  label="Manager Comments"
                  value={editManagerComments}
                  onChange={(e) => setEditManagerComments(e.target.value)}
                  placeholder="Final feedback and ratings guidance..."
                />

                <FormActions
                  onCancel={() => setSelectedReview(null)}
                  submitLabel="Save Evaluation"
                  loading={submitting}
                />
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
