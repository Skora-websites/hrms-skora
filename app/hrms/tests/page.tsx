"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileQuestion,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Search,
  Users,
  Award,
  Check,
  Eye,
  Info,
  RotateCcw,
  Calendar,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastPortal } from "@/components/ui/toast";
import { AnimatePresence, motion } from "framer-motion";
import { TestPreviewDialog } from "@/components/tests/test-preview-dialog";
import { CandidateProgressDialog } from "@/components/tests/candidate-progress-dialog";
import { CreateTestDialog } from "@/components/tests/create-test-dialog";
import { CreateQuestionDialog } from "@/components/tests/create-question-dialog";
import type {
  TestDefinition,
  TestQuestion,
  TestResultSummary,
  TestAttempt,
} from "@/services/hrm/tests/types";

const DEFAULT_DEPARTMENTS = [
  "All Departments",
  "Engineering",
  "Software Development",
  "Quality Assurance",
  "IT Infrastructure",
  "DevOps",
  "Technical Support",
  "Mobile Technology",
  "HR & People Ops",
  "Payroll & Finance",
  "Operations",
  "Marketing",
  "Sales",
  "General",
];

export default function AssessmentPortalPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const isStaff =
    user?.role === "super_admin" ||
    user?.role === "hr_admin" ||
    user?.role === "admin" ||
    user?.role === "manager";

  const [activeTab, setActiveTab] = useState<string>(
    isStaff ? "manage_tests" : "my_tests"
  );

  // Synchronize activeTab when authentication role resolves
  useEffect(() => {
    if (isStaff) {
      if (activeTab === "my_tests") {
        setActiveTab("manage_tests");
      }
    } else {
      if (activeTab !== "my_tests" && activeTab !== "results") {
        setActiveTab("my_tests");
      }
    }
  }, [isStaff]);

  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [evaluations, setEvaluations] = useState<TestAttempt[]>([]);
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; email: string; department: string }>
  >([]);
  const [departmentList, setDepartmentList] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);

  // Search queries
  const [testSearch, setTestSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [resultSearch, setResultSearch] = useState("");

  // Grade inputs state: { [qId]: marks } and { [qId]: feedback }
  const [evalMarks, setEvalMarks] = useState<Record<string, number>>({});
  const [evalFeedback, setEvalFeedback] = useState<Record<string, string>>({});
  const [savingGradeQId, setSavingGradeQId] = useState<string | null>(null);

  // Dialog states
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);
  const [previewTest, setPreviewTest] = useState<TestDefinition | null>(null);
  const [candidateProgressTest, setCandidateProgressTest] = useState<TestDefinition | null>(null);

  // Finalize confirmation dialog
  const [finalizeAttemptId, setFinalizeAttemptId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // Ensure body pointer events remain unblocked and never trapped by Radix UI
  useEffect(() => {
    const unblockPointerEvents = () => {
      if (typeof document !== "undefined" && document.body.style.pointerEvents === "none") {
        const hasOpenModal = document.querySelector('[role="dialog"], [data-state="open"]');
        if (!hasOpenModal) {
          document.body.style.pointerEvents = "";
        }
      }
    };
    unblockPointerEvents();
    const interval = setInterval(unblockPointerEvents, 250);
    return () => clearInterval(interval);
  }, [showCreateTestModal, showCreateQuestionModal, previewTest, candidateProgressTest, finalizeAttemptId]);

  // Fetch all assessment data
  const fetchData = useCallback(async () => {
    try {
      const [testsRes, questionsRes, evalsRes, resultsRes] = await Promise.all([
        fetch("/api/hrm/v2/tests"),
        fetch("/api/hrm/v2/tests/questions"),
        fetch("/api/hrm/v2/tests/evaluations"),
        fetch("/api/hrm/v2/tests/results"),
      ]);

      const [testsData, questionsData, evalsData, resultsData] = await Promise.all([
        testsRes.ok ? testsRes.json() : { data: [] },
        questionsRes.ok ? questionsRes.json() : { data: [] },
        evalsRes.ok ? evalsRes.json() : { data: [] },
        resultsRes.ok ? resultsRes.json() : { data: [] },
      ]);

      setTests(testsData.data || []);
      setQuestions(questionsData.data || []);
      setEvaluations(evalsData.data || []);
      setResults(resultsData.data || []);
    } catch {
      toast.error("Failed to load assessments data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch users and departments for authoring targeting
  const fetchMetadata = useCallback(async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        fetch("/api/hrm/v2/tests/users"),
        fetch("/api/hrm/v2/departments"),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.success) setAvailableUsers(uData.data || []);
      }

      if (deptsRes.ok) {
        const dData = await deptsRes.json();
        const depts: string[] = Array.isArray(dData.data)
          ? dData.data.map((d: { name?: string } | string) =>
              typeof d === "string" ? d : d.name || ""
            ).filter(Boolean)
          : [];

        if (depts.length > 0) {
          const merged = Array.from(new Set(["All Departments", ...depts, ...DEFAULT_DEPARTMENTS]));
          setDepartmentList(merged);
        }
      }
    } catch {
      // Keep defaults
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (isStaff) {
      fetchMetadata();
    }
  }, [fetchData, fetchMetadata, isStaff]);

  // Grade descriptive question
  const handleSaveGrade = async (attemptId: string, questionId: string) => {
    const marks = evalMarks[questionId];
    if (marks === undefined) {
      toast.error("Please enter a mark score");
      return;
    }

    setSavingGradeQId(questionId);
    try {
      const res = await fetch("/api/hrm/v2/tests/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade_question",
          attemptId,
          questionId,
          marksAwarded: marks,
          feedback: evalFeedback[questionId] || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Question score saved successfully");
        fetchData();
      } else {
        toast.error(data.error || "Failed to save score");
      }
    } catch {
      toast.error("Network error while saving score");
    } finally {
      setSavingGradeQId(null);
    }
  };

  // Finalize evaluation and release scorecard
  const handleFinalizeEvaluation = async () => {
    if (!finalizeAttemptId) return;
    setFinalizing(true);
    try {
      const res = await fetch("/api/hrm/v2/tests/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", attemptId: finalizeAttemptId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Evaluation finalized! Scorecard released to candidate.");
        setFinalizeAttemptId(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to finalize evaluation");
      }
    } catch {
      toast.error("Network error while finalizing evaluation");
    } finally {
      setFinalizing(false);
    }
  };

  // Filtered collections
  const filteredTests = useMemo(() => {
    if (!testSearch.trim()) return tests;
    const q = testSearch.toLowerCase().trim();
    return tests.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tests, testSearch]);

  const filteredQuestions = useMemo(() => {
    if (!questionSearch.trim()) return questions;
    const q = questionSearch.toLowerCase().trim();
    return questions.filter(
      (qu) =>
        qu.text.toLowerCase().includes(q) ||
        qu.topic.toLowerCase().includes(q) ||
        qu.type.toLowerCase().includes(q)
    );
  }, [questions, questionSearch]);

  const filteredResults = useMemo(() => {
    if (!resultSearch.trim()) return results;
    const q = resultSearch.toLowerCase().trim();
    return results.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        r.testTitle.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q)
    );
  }, [results, resultSearch]);

  return (
    <AppShell>
      <ToastPortal>
        <AnimatePresence>
          {toast.toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Toast
                variant={t.variant}
                message={t.message}
                description={t.description}
                onClose={() => toast.dismissToast(t.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </ToastPortal>

      <div className="space-y-6">
        <PageHeader
          title="Skill Assessments & Tests"
          description={
            isStaff
              ? "Author team evaluations, configure question bank, and grade candidate submissions."
              : "Complete assigned domain tests, view scorecards, and track your certifications."
          }
          action={
            isStaff ? (
              <div className="flex items-center gap-2.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateQuestionModal(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Question</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateTestModal(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Author Assessment</span>
                </Button>
              </div>
            ) : undefined
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-border/80 pb-3">
            <TabsList className="h-auto min-h-10 flex-wrap items-center justify-start gap-1 p-1 bg-muted/60 rounded-xl border border-border/70 text-muted-foreground w-full sm:w-auto">
              {!isStaff && (
                <TabsTrigger value="my_tests" className="gap-2 cursor-pointer relative z-10">
                  <span>Available Tests</span>
                  <Badge variant="secondary" size="sm" className="pointer-events-none">
                    {tests.length}
                  </Badge>
                </TabsTrigger>
              )}

              {isStaff && (
                <TabsTrigger value="manage_tests" className="gap-2 cursor-pointer relative z-10">
                  <span>Manage Tests</span>
                  <Badge variant="secondary" size="sm" className="pointer-events-none">
                    {tests.length}
                  </Badge>
                </TabsTrigger>
              )}
              {isStaff && (
                <TabsTrigger value="question_bank" className="gap-2 cursor-pointer relative z-10">
                  <span>Question Bank</span>
                  <Badge variant="secondary" size="sm" className="pointer-events-none">
                    {questions.length}
                  </Badge>
                </TabsTrigger>
              )}
              {isStaff && (
                <TabsTrigger value="evaluations" className="gap-2 cursor-pointer relative z-10">
                  <span>Review & Grading</span>
                  {evaluations.length > 0 ? (
                    <Badge variant="danger" size="sm" className="pointer-events-none">
                      {evaluations.length}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm" className="pointer-events-none">
                      0
                    </Badge>
                  )}
                </TabsTrigger>
              )}

              <TabsTrigger value="results" className="gap-2 cursor-pointer relative z-10">
                <span>{isStaff ? "Team Results" : "My Scorecard"}</span>
                <Badge variant="secondary" size="sm" className="pointer-events-none">
                  {results.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: Candidate Available Tests */}
          {!isStaff && (
            <TabsContent value="my_tests" className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assigned assessments..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your assessments...</p>
                </div>
              ) : filteredTests.length === 0 ? (
                <EmptyState
                  icon={FileQuestion}
                  title="No assessments assigned"
                  description="You are completely caught up! No active tests require your submission right now."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTests.map((t) => {
                    const userResult = results.find((r) => r.testId === t.id);
                    const isOverdue = t.dueDate ? new Date(t.dueDate).getTime() < Date.now() : false;
                    const isUpcoming = t.startDate ? new Date(t.startDate).getTime() > Date.now() : false;
                    const extraGranted = (t.grantedRetakes && user?.id && t.grantedRetakes[user.id]) || 0;
                    const maxAttempts = (t.maxAttempts || 1) + extraGranted;

                    return (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all hover:border-primary/40 hover:shadow-xs"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge variant="outline" size="sm">
                              {t.targetType === "SPECIFIC_USERS"
                                ? "Targeted to You"
                                : t.department || "General"}
                            </Badge>

                            <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="h-3.5 w-3.5" />
                              {t.durationMinutes}m
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-foreground tracking-tight">
                              {t.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {t.description || "Comprehensive assessment covering core skills."}
                            </p>
                          </div>

                          {/* Meta & Deadlines */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                            {t.dueDate && (
                              <span
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-md border ${
                                  isOverdue
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                    : "bg-muted/40 text-muted-foreground border-border/70"
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {isOverdue
                                  ? "Deadline Passed"
                                  : `Due: ${new Date(t.dueDate).toLocaleDateString()}`}
                              </span>
                            )}
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border/70">
                              <RotateCcw className="h-3 w-3" /> Max Attempts: {maxAttempts}
                            </span>
                          </div>

                          {userResult && (
                            <div className="pt-2">
                              <Badge
                                variant={userResult.passed ? "success" : "danger"}
                                size="sm"
                              >
                                {userResult.passed
                                  ? `Passed (${userResult.percentage}%)`
                                  : `Failed (${userResult.percentage}%)`}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-border/70 flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs text-muted-foreground font-mono">
                            <span>{t.questionIds?.length || 0} Qs</span>
                            <span className="mx-1">•</span>
                            <span>Pass: {t.passPercentage}%</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewTest(t)}
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              <Info className="h-3.5 w-3.5" />
                              <span>Overview</span>
                            </Button>

                            {isUpcoming ? (
                              <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs font-semibold bg-muted text-muted-foreground"
                              >
                                Unlocks {new Date(t.startDate!).toLocaleDateString()}
                              </Button>
                            ) : isOverdue && !userResult ? (
                              <Button
                                size="sm"
                                disabled
                                className="h-8 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30"
                              >
                                Expired
                              </Button>
                            ) : userResult ? (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                                className="h-8 text-xs font-semibold gap-1.5"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Retake Test</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                                className="h-8 text-xs font-semibold gap-1.5"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                <span>Start Test</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {/* TAB: Manage Tests (Staff View) */}
          {isStaff && (
            <TabsContent value="manage_tests" className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search author assessments..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading assessments...</p>
                </div>
              ) : filteredTests.length === 0 ? (
                <EmptyState
                  icon={FileQuestion}
                  title="No assessments published"
                  description="Click 'Author Assessment' above to design a test, set passing criteria, and assign candidates."
                  action={{
                    label: "Author Assessment",
                    onClick: () => setShowCreateTestModal(true),
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTests.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-border"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground tracking-tight">
                            {t.title}
                          </span>

                          {t.targetType === "SPECIFIC_USERS" ? (
                            <Badge variant="info" size="sm">
                              {t.targetUserIds?.length || 0} Targeted Candidates
                            </Badge>
                          ) : (
                            <Badge variant="outline" size="sm">
                              {t.department || "General"}
                            </Badge>
                          )}

                          <Badge
                            variant={t.status === "active" ? "success" : "secondary"}
                            size="sm"
                            className="capitalize"
                          >
                            {t.status || "active"}
                          </Badge>
                        </div>

                        {t.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {t.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono flex-wrap">
                          <span>{t.durationMinutes} mins</span>
                          <span>•</span>
                          <span>{t.questionIds?.length || 0} questions</span>
                          <span>•</span>
                          <span>Total: {t.totalMarks} Marks</span>
                          <span>•</span>
                          <span>Pass: {t.passPercentage}%</span>
                          <span>•</span>
                          <span>Max Attempts: {t.maxAttempts || 1}</span>
                          {t.dueDate && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Due:{" "}
                                {new Date(t.dueDate).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCandidateProgressTest(t)}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span>Candidate Progress</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTest(t)}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Quick Preview</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                          className="h-8 text-xs font-semibold gap-1.5"
                          title="Experience candidate interface in simulator preview mode"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Simulator Preview</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* TAB: Question Bank (Staff View) */}
          {isStaff && (
            <TabsContent value="question_bank" className="space-y-4 pt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions by text or topic..."
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading question bank...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <EmptyState
                  icon={FileQuestion}
                  title="Question Bank is empty"
                  description="Add reusable single/multi-choice MCQs or open-ended descriptive test questions."
                  action={{
                    label: "Add First Question",
                    onClick: () => setShowCreateQuestionModal(true),
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-3 transition-colors hover:border-border"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Badge
                            variant={q.type === "MCQ" ? "info" : "warning"}
                            size="sm"
                          >
                            {q.type}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {q.topic}
                          </Badge>
                        </div>

                        <span className="text-xs font-mono text-muted-foreground">
                          {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                        </span>
                      </div>

                      <p className="text-xs text-foreground font-medium whitespace-pre-wrap leading-relaxed">
                        {q.text}
                      </p>

                      {q.type === "MCQ" && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          {q.options.map((opt) => {
                            const isCorrect = q.correctOptions?.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-lg border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                    : "bg-muted/30 border-border/60 text-muted-foreground"
                                }`}
                              >
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "DESCRIPTIVE" && q.referenceAnswer && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/70 text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-foreground">Model Solution: </span>
                          <p className="leading-relaxed">{q.referenceAnswer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* TAB: Review & Grading (Staff View) */}
          {isStaff && (
            <TabsContent value="evaluations" className="space-y-4 pt-2">
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Checking pending submissions...</p>
                </div>
              ) : evaluations.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="All candidate submissions graded"
                  description="There are no pending subjective evaluations. Candidate scorecards are up to date."
                />
              ) : (
                <div className="space-y-4">
                  {evaluations.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-foreground">
                            {a.userName} ({a.userEmail}) • {a.department}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Assessment:{" "}
                            <span className="font-semibold text-foreground">{a.testTitle}</span> •
                            Submitted on{" "}
                            {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "Recently"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge variant="outline" size="sm" className="font-mono">
                            Auto MCQ: {a.mcqScore}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => setFinalizeAttemptId(a.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Finalize & Release Result
                          </Button>
                        </div>
                      </div>

                      {/* Answers needing review */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Descriptive Responses to Grade:
                        </span>

                        {Object.entries(a.answers || {}).map(([qId, ans]) => {
                          if (ans.selectedOptions && ans.selectedOptions.length > 0) return null;
                          const isSaving = savingGradeQId === qId;

                          return (
                            <div
                              key={qId}
                              className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3 text-xs"
                            >
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  Question Reference: {qId}
                                </span>
                                <Badge
                                  variant={ans.evaluated ? "success" : "warning"}
                                  size="sm"
                                >
                                  {ans.evaluated ? "Score Assigned" : "Needs Grading"}
                                </Badge>
                              </div>

                              <p className="p-3.5 rounded-lg bg-background border border-border/60 text-foreground whitespace-pre-wrap leading-relaxed">
                                {ans.descriptiveText || "(No written response provided)"}
                              </p>

                              <div className="flex items-center gap-3 pt-1 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-medium">Marks:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    defaultValue={ans.marksAwarded || 0}
                                    onChange={(e) =>
                                      setEvalMarks((prev) => ({
                                        ...prev,
                                        [qId]: Number(e.target.value),
                                      }))
                                    }
                                    className="w-16 h-8 px-2 rounded-lg bg-background border border-border/80 text-center font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>

                                <input
                                  type="text"
                                  placeholder="Evaluator feedback & comments..."
                                  defaultValue={ans.feedback || ""}
                                  onChange={(e) =>
                                    setEvalFeedback((prev) => ({
                                      ...prev,
                                      [qId]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 min-w-[200px] h-8 px-3 rounded-lg bg-background border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={isSaving}
                                  onClick={() => handleSaveGrade(a.id, qId)}
                                  className="h-8 text-xs font-semibold"
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                  ) : null}
                                  <span>Save Score</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* TAB: Results & Scorecards */}
          <TabsContent value="results" className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidate scorecards..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading scorecards...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No scorecards on record"
                description="Finalized test evaluations and performance scores will appear here once candidates complete tests."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredResults.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-border"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{r.userName}</span>
                        <Badge variant="outline" size="sm">
                          {r.department}
                        </Badge>
                        <span className="text-xs text-muted-foreground">• {r.testTitle}</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        Completed: {new Date(r.completedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-foreground">
                          {r.totalScore} / {r.maxScore} ({r.percentage}%)
                        </div>
                        <Badge
                          variant={r.passed ? "success" : "danger"}
                          size="sm"
                          className="mt-0.5"
                        >
                          {r.passed ? `PASSED (${r.grade})` : `FAILED (${r.grade})`}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog: Finalize Evaluation */}
      <AlertDialog
        open={Boolean(finalizeAttemptId)}
        onOpenChange={(open) => !open && setFinalizeAttemptId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Grading & Release Scorecard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the subjective grades, calculate the candidate’s final percentage, and
              instantly release the evaluation scorecard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={finalizing} onClick={handleFinalizeEvaluation}>
              {finalizing ? "Releasing..." : "Release Result"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Quick Preview */}
      <TestPreviewDialog
        open={Boolean(previewTest)}
        onOpenChange={(open) => !open && setPreviewTest(null)}
        testItem={previewTest}
        isStaff={isStaff}
        onLaunchInteractive={(testId) => router.push(`/hrms/tests/take/${testId}`)}
      />

      {/* Dialog: Candidate Progress & Retakes */}
      <CandidateProgressDialog
        open={Boolean(candidateProgressTest)}
        onOpenChange={(open) => !open && setCandidateProgressTest(null)}
        testItem={candidateProgressTest}
        onRetakeGranted={fetchData}
      />

      {/* Dialog: Create Test */}
      <CreateTestDialog
        open={showCreateTestModal}
        onOpenChange={setShowCreateTestModal}
        questions={questions}
        departmentList={departmentList}
        availableUsers={availableUsers}
        userDepartment={user?.department || undefined}
        onCreated={fetchData}
      />

      {/* Dialog: Create Question */}
      <CreateQuestionDialog
        open={showCreateQuestionModal}
        onOpenChange={setShowCreateQuestionModal}
        onCreated={fetchData}
      />
    </AppShell>
  );
}
