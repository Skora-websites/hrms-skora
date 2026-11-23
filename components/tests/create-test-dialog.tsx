"use client";

import { useState, useMemo } from "react";
import {
  FileQuestion,
  Search,
  Check,
  Target,
  Calendar,
  Clock,
  RotateCcw,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { TestQuestion } from "@/services/hrm/tests/types";

interface UserOption {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface CreateTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: TestQuestion[];
  departmentList: string[];
  availableUsers: UserOption[];
  userDepartment?: string;
  onCreated: () => void;
}

export function CreateTestDialog({
  open,
  onOpenChange,
  questions,
  departmentList,
  availableUsers,
  userDepartment,
  onCreated,
}: CreateTestDialogProps) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState(userDepartment || "Engineering");
  const [targetType, setTargetType] = useState<"DEPARTMENT" | "SPECIFIC_USERS">("DEPARTMENT");
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passPercentage, setPassPercentage] = useState(60);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(3);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Bank filters
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("ALL");
  const [questionTopicFilter, setQuestionTopicFilter] = useState<string>("ALL");

  const availableTopics = useMemo(
    () => Array.from(new Set(questions.map((q) => q.topic).filter(Boolean))),
    [questions]
  );

  const qMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const totalSelectedMarks = useMemo(
    () =>
      selectedQuestionIds.reduce(
        (sum, qId) => sum + (qMap.get(qId)?.maxMarks || 2),
        0
      ),
    [selectedQuestionIds, qMap]
  );

  const passMarksRequired = Math.ceil((totalSelectedMarks * (passPercentage || 60)) / 100);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !questionSearch.trim() ||
        q.text.toLowerCase().includes(questionSearch.toLowerCase().trim()) ||
        q.topic.toLowerCase().includes(questionSearch.toLowerCase().trim());
      const matchesType = questionTypeFilter === "ALL" || q.type === questionTypeFilter;
      const matchesTopic = questionTopicFilter === "ALL" || q.topic === questionTopicFilter;
      return matchesSearch && matchesType && matchesTopic;
    });
  }, [questions, questionSearch, questionTypeFilter, questionTopicFilter]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return availableUsers;
    const q = userSearchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
    );
  }, [availableUsers, userSearchQuery]);

  const handleSelectAllFiltered = () => {
    const ids = filteredQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAllFiltered = () => {
    const idsToRemove = new Set(filteredQuestions.map((q) => q.id));
    setSelectedQuestionIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDepartment(userDepartment || "Engineering");
    setTargetType("DEPARTMENT");
    setTargetUserIds([]);
    setUserSearchQuery("");
    setStartDate("");
    setDueDate("");
    setMaxAttempts(1);
    setDurationMinutes(30);
    setPassPercentage(60);
    setRequireFullscreen(false);
    setMaxViolationsAllowed(3);
    setSelectedQuestionIds([]);
    setQuestionSearch("");
    setQuestionTypeFilter("ALL");
    setQuestionTopicFilter("ALL");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a test title");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      toast.error("Please select at least 1 question from the Question Bank");
      return;
    }
    if (targetType === "SPECIFIC_USERS" && targetUserIds.length === 0) {
      toast.error("Please select at least 1 targeted employee");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        department: targetType === "DEPARTMENT" ? department : "Specific Candidates",
        targetType,
        targetUserIds: targetType === "SPECIFIC_USERS" ? targetUserIds : [],
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        maxAttempts: Number(maxAttempts) || 1,
        durationMinutes: Number(durationMinutes),
        passPercentage: Number(passPercentage),
        questionIds: selectedQuestionIds,
        proctoring: {
          requireFullscreen,
          maxViolationsAllowed: Number(maxViolationsAllowed),
          autoSubmitOnTimerExpiry: true,
        },
      };

      const res = await fetch("/api/hrm/v2/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Assessment created and scheduled successfully");
        resetForm();
        onOpenChange(false);
        onCreated();
      } else {
        toast.error(data.error || "Failed to create assessment");
      }
    } catch {
      toast.error("Network error while creating assessment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[92vh] flex flex-col p-6">
        <DialogHeader className="border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileQuestion className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Author New Assessment
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure test scope, scheduling deadlines, candidate targeting, and proctoring rules.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
          {/* Title and Description */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Test Title <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Full-Stack Node.js & React Competency Evaluation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Description & Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Guidelines, syllabus scope, and instructions for candidates..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
            </div>
          </div>

          {/* Candidate Targeting Mode */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Candidate Assignment Mode
              </span>

              <div className="inline-flex rounded-lg border border-border/80 bg-background p-1">
                <button
                  type="button"
                  onClick={() => setTargetType("DEPARTMENT")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    targetType === "DEPARTMENT"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  By Department
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("SPECIFIC_USERS")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    targetType === "SPECIFIC_USERS"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Specific Employees
                </button>
              </div>
            </div>

            {targetType === "DEPARTMENT" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Target Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/80 bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {departmentList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Selected: <strong className="text-foreground">{targetUserIds.length}</strong> employees
                  </span>
                  {targetUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetUserIds([])}
                      className="text-[11px] text-rose-500 hover:underline font-semibold"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, or department..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto rounded-lg border border-border/80 bg-background p-1.5 space-y-1">
                  {filteredUsers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      No matching employees found
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = targetUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setTargetUserIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== u.id)
                                : [...prev, u.id]
                            );
                          }}
                          className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary/40 font-semibold text-foreground"
                              : "border-border/60 text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <div>
                            <span className="text-foreground">{u.name}</span>
                            <span className="text-[11px] text-muted-foreground ml-1.5">
                              ({u.department})
                            </span>
                          </div>

                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Test Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Duration (mins)
              </label>
              <Input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Pass Benchmark (%)
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={passPercentage}
                onChange={(e) => setPassPercentage(Math.min(100, Math.max(1, Number(e.target.value))))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                Max Attempts
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>

          {/* Scheduling: Start & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-border/80 bg-muted/30">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Unlock Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Due Date / Deadline (Optional)
              </label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Proctoring Settings */}
          <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Proctoring & Anti-Cheating Controls
            </span>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={requireFullscreen}
                  onChange={(e) => setRequireFullscreen(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Enforce Fullscreen Mode</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Max Tab Violations:</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxViolationsAllowed}
                  onChange={(e) => setMaxViolationsAllowed(Number(e.target.value))}
                  className="w-16 h-8 px-2 rounded-lg border border-border/80 bg-background text-center text-xs font-semibold text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Question Bank Selection */}
          <div className="space-y-3 rounded-xl border border-border/80 bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-foreground">
                Select Questions from Bank ({selectedQuestionIds.length} chosen)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Select Filtered ({filteredQuestions.length})
                </button>
                <span className="text-muted-foreground">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="text-[11px] font-semibold text-rose-500 hover:underline"
                >
                  Deselect Filtered
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={questionTypeFilter}
                onChange={(e) => setQuestionTypeFilter(e.target.value)}
                className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Types</option>
                <option value="MCQ">MCQ Only</option>
                <option value="DESCRIPTIVE">Descriptive Only</option>
              </select>

              <select
                value={questionTopicFilter}
                onChange={(e) => setQuestionTopicFilter(e.target.value)}
                className="h-8 rounded-lg border border-border/80 bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Topics</option>
                {availableTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            </div>

            {/* Questions List */}
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border/80 bg-background p-2 space-y-2">
              {filteredQuestions.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">No questions found</p>
                  <p className="text-[11px]">Adjust your search query or topic filter</p>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const isChosen = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setSelectedQuestionIds((prev) =>
                          isChosen ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                        );
                      }}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-3 select-none ${
                        isChosen
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : "border-border/60 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isChosen
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChosen && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={q.type === "MCQ" ? "info" : "warning"}
                            size="sm"
                          >
                            {q.type}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {q.topic}
                          </Badge>
                          <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                            {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                          {q.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Live Marks Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border/70 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Selected:</span>
                <strong className="text-foreground">{selectedQuestionIds.length} Questions</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Total Marks:</span>
                <strong className="text-primary font-bold">{totalSelectedMarks} Marks</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Passing ({passPercentage}%):</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {passMarksRequired} Marks
                </strong>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                "Publish Assessment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
