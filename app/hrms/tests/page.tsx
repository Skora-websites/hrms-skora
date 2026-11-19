"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileQuestion,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  Award,
  AlertCircle,
  FileCheck,
  Building2,
  Trash2,
  Check,
  ChevronRight,
  Loader2,
  GraduationCap,
  ShieldCheck,
  ArrowLeft,
  Eye,
  Info,
  Sparkles,
  RotateCcw,
  Calendar,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import type {
  TestDefinition,
  TestQuestion,
  TestResultSummary,
  TestAttempt,
  CandidateProgressItem,
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

  const isStaff =
    user?.role === "super_admin" ||
    user?.role === "hr_admin" ||
    user?.role === "admin" ||
    user?.role === "manager";

  const [activeTab, setActiveTab] = useState<
    "my_tests" | "manage_tests" | "question_bank" | "evaluations" | "results"
  >("my_tests");

  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [evaluations, setEvaluations] = useState<TestAttempt[]>([]);
  const [results, setResults] = useState<TestResultSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [showCreateQuestionModal, setShowCreateQuestionModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<TestAttempt | null>(null);
  const [evalMarks, setEvalMarks] = useState<Record<string, number>>({});
  const [evalFeedback, setEvalFeedback] = useState<Record<string, string>>({});

  // Preview state
  const [previewTest, setPreviewTest] = useState<any | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<TestQuestion[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handleOpenPreviewModal = async (testItem: TestDefinition) => {
    setPreviewTest(testItem);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/hrm/v2/tests/${testItem.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPreviewTest(data.data);
        setPreviewQuestions(data.data.questions || []);
      }
    } catch (err) {
      console.error("Failed to load test preview", err);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Targeting & candidate progress state
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; email: string; department: string }>
  >([]);
  const [candidateProgressTest, setCandidateProgressTest] = useState<TestDefinition | null>(null);
  const [candidateProgressList, setCandidateProgressList] = useState<CandidateProgressItem[]>([]);
  const [loadingCandidateProgress, setLoadingCandidateProgress] = useState(false);
  const [grantingRetakeUserId, setGrantingRetakeUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const handleOpenCandidateProgress = async (testItem: TestDefinition) => {
    setCandidateProgressTest(testItem);
    setLoadingCandidateProgress(true);
    try {
      const res = await fetch(`/api/hrm/v2/tests/${testItem.id}/candidates`);
      const data = await res.json();
      if (data.success) {
        setCandidateProgressList(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load candidate progress", err);
    } finally {
      setLoadingCandidateProgress(false);
    }
  };

  const handleGrantRetake = async (testId: string, userId: string) => {
    if (!confirm("Grant an additional attempt (+1 retake) to this candidate?")) return;
    setGrantingRetakeUserId(userId);
    try {
      const res = await fetch(`/api/hrm/v2/tests/${testId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grant_retake", userId }),
      });
      const data = await res.json();
      if (data.success) {
        setCandidateProgressList((prev) =>
          prev.map((c) =>
            c.userId === userId
              ? { ...c, maxAttemptsAllowed: c.maxAttemptsAllowed + 1 }
              : c
          )
        );
        fetchData();
        alert("Retake attempt granted successfully!");
      } else {
        alert(data.error || "Failed to grant retake");
      }
    } catch {
      alert("Network error while granting retake");
    } finally {
      setGrantingRetakeUserId(null);
    }
  };

  const [departmentList, setDepartmentList] = useState<string[]>(DEFAULT_DEPARTMENTS);

  // Form state for new test
  const [newTest, setNewTest] = useState({
    title: "",
    description: "",
    department: user?.department || "Engineering",
    targetType: "DEPARTMENT" as "DEPARTMENT" | "SPECIFIC_USERS",
    targetUserIds: [] as string[],
    startDate: "",
    dueDate: "",
    maxAttempts: 1,
    durationMinutes: 30,
    passPercentage: 60,
    selectedQuestionIds: [] as string[],
    requireFullscreen: false,
    maxViolationsAllowed: 3,
  });

  // Form state for new question
  const [newQuestion, setNewQuestion] = useState({
    type: "MCQ" as "MCQ" | "DESCRIPTIVE",
    text: "",
    topic: "General",
    options: [
      { id: "opt_1", text: "" },
      { id: "opt_2", text: "" },
      { id: "opt_3", text: "" },
      { id: "opt_4", text: "" },
    ],
    correctOptionId: "opt_1",
    referenceAnswer: "",
    maxMarks: 2,
  });

  // Question selection filters in Author Test modal
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<"ALL" | "MCQ" | "DESCRIPTIVE">("ALL");
  const [questionTopicFilter, setQuestionTopicFilter] = useState<string>("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch tests
      const testsRes = await fetch("/api/hrm/v2/tests");
      const testsJson = await testsRes.json();
      if (testsJson.success) setTests(testsJson.data || []);

      // 2. Fetch results
      const resRes = await fetch("/api/hrm/v2/tests/results");
      const resJson = await resRes.json();
      if (resJson.success) setResults(resJson.data || []);

      // 3. If staff, fetch questions, evaluations, and candidates
      if (isStaff) {
        const qRes = await fetch("/api/hrm/v2/tests/questions");
        const qJson = await qRes.json();
        if (qJson.success) setQuestions(qJson.data || []);

        const evalRes = await fetch("/api/hrm/v2/tests/evaluations");
        const evalJson = await evalRes.json();
        if (evalJson.success) setEvaluations(evalJson.data || []);

        const uRes = await fetch("/api/hrm/v2/tests/users");
        const uJson = await uRes.json();
        const usersList: any[] = uJson.data || [];
        if (uJson.success) setAvailableUsers(usersList);

        try {
          const orgDeptRes = await fetch("/api/hrm/v2/organizations?type=departments");
          const orgDeptJson = await orgDeptRes.json();
          const orgDepts: string[] = (orgDeptJson.data || [])
            .map((d: any) => d.name || d.title || d.department)
            .filter(Boolean);
          const userDepts: string[] = usersList
            .map((u: any) => u.department)
            .filter(Boolean);
          const combined = Array.from(
            new Set(["All Departments", ...orgDepts, ...userDepts, ...DEFAULT_DEPARTMENTS])
          );
          setDepartmentList(combined);
        } catch {
          // fallback to DEFAULT_DEPARTMENTS
        }
      }
    } catch (err) {
      console.error("Failed to load assessments data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isStaff) {
      setActiveTab("manage_tests");
    } else {
      setActiveTab("my_tests");
    }
  }, [isStaff]);

  // Create Question
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.text.trim()) return;

    try {
      const payload: any = {
        type: newQuestion.type,
        text: newQuestion.text,
        topic: newQuestion.topic,
        maxMarks: Number(newQuestion.maxMarks),
      };

      if (newQuestion.type === "MCQ") {
        payload.options = newQuestion.options.filter((o) => o.text.trim().length > 0);
        payload.correctOptions = [newQuestion.correctOptionId];
        payload.answerMode = "SINGLE";
      } else {
        payload.referenceAnswer = newQuestion.referenceAnswer;
      }

      const res = await fetch("/api/hrm/v2/tests/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateQuestionModal(false);
        setNewQuestion({
          type: "MCQ",
          text: "",
          topic: "General",
          options: [
            { id: "opt_1", text: "" },
            { id: "opt_2", text: "" },
            { id: "opt_3", text: "" },
            { id: "opt_4", text: "" },
          ],
          correctOptionId: "opt_1",
          referenceAnswer: "",
          maxMarks: 2,
        });
        fetchData();
      } else {
        alert(data.error || "Failed to create question");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Create Test
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTest.title.trim()) return;
    if (newTest.selectedQuestionIds.length === 0) {
      alert("Please select at least one question for the test.");
      return;
    }
    if (newTest.targetType === "SPECIFIC_USERS" && newTest.targetUserIds.length === 0) {
      alert("Please select at least one specific employee for assignment.");
      return;
    }

    try {
      const payload = {
        title: newTest.title,
        description: newTest.description,
        department: newTest.department || "General",
        durationMinutes: Number(newTest.durationMinutes),
        passPercentage: Number(newTest.passPercentage),
        questionIds: newTest.selectedQuestionIds,
        targetType: newTest.targetType,
        targetUserIds: newTest.targetType === "SPECIFIC_USERS" ? newTest.targetUserIds : [],
        startDate: newTest.startDate ? new Date(newTest.startDate).toISOString() : null,
        dueDate: newTest.dueDate ? new Date(newTest.dueDate).toISOString() : null,
        maxAttempts: Math.max(1, Number(newTest.maxAttempts || 1)),
        proctoring: {
          requireFullscreen: newTest.requireFullscreen,
          maxViolationsAllowed: Number(newTest.maxViolationsAllowed),
          lockOnViolationExceeded: true,
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
        setShowCreateTestModal(false);
        setNewTest({
          title: "",
          description: "",
          department: user?.department || "Engineering",
          targetType: "DEPARTMENT",
          targetUserIds: [],
          startDate: "",
          dueDate: "",
          maxAttempts: 1,
          durationMinutes: 30,
          passPercentage: 60,
          selectedQuestionIds: [],
          requireFullscreen: false,
          maxViolationsAllowed: 3,
        });
        fetchData();
      } else {
        alert(data.error || "Failed to create test");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Grade descriptive question
  const handleSaveGrade = async (attemptId: string, questionId: string) => {
    const marks = evalMarks[questionId];
    if (marks === undefined) return;
    try {
      await fetch("/api/hrm/v2/tests/evaluations", {
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
      alert("Question grade saved.");
    } catch {
      alert("Failed to save grade");
    }
  };

  // Finalize evaluation
  const handleFinalizeEvaluation = async (attemptId: string) => {
    if (!confirm("Finalize grading and release scorecard to candidate?")) return;
    try {
      const res = await fetch("/api/hrm/v2/tests/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", attemptId }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEvaluation(null);
        fetchData();
      } else {
        alert(data.error || "Failed to finalize evaluation");
      }
    } catch (err: any) {
      alert(err.message || "Failed to finalize evaluation");
    }
  };

  const availableTopics = Array.from(new Set(questions.map((q) => q.topic).filter(Boolean)));
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const totalSelectedMarks = newTest.selectedQuestionIds.reduce(
    (sum, qId) => sum + (qMap.get(qId)?.maxMarks || 2),
    0
  );
  const passMarksRequired = Math.ceil(
    (totalSelectedMarks * (newTest.passPercentage || 60)) / 100
  );

  const filteredBankQuestions = questions.filter((q) => {
    const matchesSearch =
      !questionSearchQuery.trim() ||
      q.text.toLowerCase().includes(questionSearchQuery.toLowerCase().trim()) ||
      q.topic.toLowerCase().includes(questionSearchQuery.toLowerCase().trim());
    const matchesType = questionTypeFilter === "ALL" || q.type === questionTypeFilter;
    const matchesTopic = questionTopicFilter === "ALL" || q.topic === questionTopicFilter;
    return matchesSearch && matchesType && matchesTopic;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Assessment & Testing Portal
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isStaff
                    ? "Author team assessments, configure question bank, and review & grade candidate marks."
                    : "Complete assigned proctored assessments, view scorecards, and track your domain evaluations."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              href="/hrms"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted/70 active:scale-95 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Return to HRMS</span>
            </Link>

            {isStaff && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateQuestionModal(true)}
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Question
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCreateTestModal(true)}
                  className="rounded-xl text-xs h-9 font-semibold bg-primary text-primary-foreground gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Author Assessment
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/80 overflow-x-auto">
        {!isStaff && (
          <button
            onClick={() => setActiveTab("my_tests")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "my_tests"
                ? "bg-background text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Available Tests ({tests.length})
          </button>
        )}

        {isStaff && (
          <>
            <button
              onClick={() => setActiveTab("manage_tests")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "manage_tests"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manage Assessments ({tests.length})
            </button>
            <button
              onClick={() => setActiveTab("question_bank")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === "question_bank"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Question Bank ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab("evaluations")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === "evaluations"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Review Marks &amp; Grading</span>
              {evaluations.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {evaluations.length}
                </span>
              )}
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab("results")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "results"
              ? "bg-background text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {isStaff ? `Team Results & Marks (${results.length})` : `My Scorecard (${results.length})`}
        </button>
      </div>

      {/* Tab: Available Tests (Candidate View) */}
      {activeTab === "my_tests" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.length === 0 ? (
              <div className="col-span-full p-12 text-center border border-dashed border-border/80 rounded-3xl bg-card text-muted-foreground text-xs">
                No active assessments assigned to you right now. You are all caught up!
              </div>
            ) : (
              tests.map((t) => {
                const userResult = results.find((r) => r.testId === t.id);
                const isOverdue = t.dueDate ? new Date(t.dueDate).getTime() < Date.now() : false;
                const isUpcoming = t.startDate ? new Date(t.startDate).getTime() > Date.now() : false;
                const extraGranted = (t.grantedRetakes && user?.id && t.grantedRetakes[user.id]) || 0;
                const maxAttempts = (t.maxAttempts || 1) + extraGranted;

                return (
                  <div
                    key={t.id}
                    className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {t.targetType === "SPECIFIC_USERS" ? "🎯 Targeted to You" : `${t.department} • ${t.category || "General"}`}
                          </Badge>
                          {userResult && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-bold ${
                                userResult.passed ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                              }`}
                            >
                              {userResult.passed ? `Passed (${userResult.percentage}%)` : `Failed (${userResult.percentage}%)`}
                            </Badge>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {t.durationMinutes}m
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground">{t.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {t.description || "Comprehensive assessment covering core domain skills."}
                      </p>

                      {/* Deadlines & Attempt badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono">
                        {t.dueDate && (
                          <span
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
                              isOverdue
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                : "bg-muted/40 text-muted-foreground border-border/60"
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {isOverdue ? "Deadline Passed" : `Due: ${new Date(t.dueDate).toLocaleDateString()}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/40 text-muted-foreground border border-border/60">
                          <RotateCcw className="w-3 h-3" /> Max Attempts: {maxAttempts}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-muted-foreground">
                        <span>{t.questionIds?.length || 0} Questions • </span>
                        <span>Pass: {t.passPercentage}%</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenPreviewModal(t)}
                          className="rounded-xl h-8 text-xs font-semibold gap-1"
                        >
                          <Info className="w-3 h-3" /> Overview
                        </Button>

                        {isUpcoming ? (
                          <Button
                            size="sm"
                            disabled
                            className="rounded-xl h-8 text-xs font-semibold bg-muted text-muted-foreground"
                          >
                            Unlocks {new Date(t.startDate!).toLocaleDateString()}
                          </Button>
                        ) : isOverdue && !userResult ? (
                          <Button
                            size="sm"
                            disabled
                            className="rounded-xl h-8 text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/30"
                          >
                            Deadline Passed
                          </Button>
                        ) : userResult ? (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                            className="rounded-xl h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Retake Test
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                            className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" /> Start Test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Question Bank */}
      {activeTab === "question_bank" && isStaff && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {questions.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/80 rounded-3xl bg-card text-muted-foreground text-xs">
                Question Bank is empty. Click &ldquo;New Question&rdquo; to add MCQs and descriptive questions.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        Q{idx + 1}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold ${
                          q.type === "MCQ" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                        }`}
                      >
                        {q.type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {q.topic}
                      </Badge>
                    </div>

                    <span className="text-[11px] font-mono text-muted-foreground">
                      {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                    </span>
                  </div>

                  <p className="text-xs text-foreground font-medium whitespace-pre-wrap">{q.text}</p>

                  {q.type === "MCQ" && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]">
                      {q.options.map((opt) => {
                        const isCorrect = q.correctOptions?.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                                : "bg-muted/40 border-border/60 text-muted-foreground"
                            }`}
                          >
                            <span>{opt.text}</span>
                            {isCorrect && <Check className="w-3 h-3 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "DESCRIPTIVE" && q.referenceAnswer && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground mt-2">
                      <span className="font-bold text-foreground">Model Answer: </span>
                      {q.referenceAnswer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Manage Tests */}
      {activeTab === "manage_tests" && isStaff && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {tests.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-foreground">{t.title}</span>
                    {t.targetType === "SPECIFIC_USERS" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-indigo-600 border-indigo-500/30 font-semibold"
                      >
                        🎯 {t.targetUserIds?.length || 0} Targeted Candidates
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        🏢 Dept: {t.department}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold capitalize"
                    >
                      {t.status}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground">{t.description}</p>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono flex-wrap">
                    <span>{t.durationMinutes} mins</span>
                    <span>•</span>
                    <span>{t.questionIds?.length || 0} questions</span>
                    <span>•</span>
                    <span>Total Marks: {t.totalMarks}</span>
                    <span>•</span>
                    <span>Pass: {t.passPercentage}%</span>
                    <span>•</span>
                    <span>Max Attempts: {t.maxAttempts || 1}</span>
                    {t.dueDate && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Due:{" "}
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
                    onClick={() => handleOpenCandidateProgress(t)}
                    className="h-8 text-xs rounded-xl gap-1.5 font-semibold hover:border-primary/50 hover:text-primary"
                  >
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Candidate Progress</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPreviewModal(t)}
                    className="h-8 text-xs rounded-xl gap-1.5 font-semibold"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Quick Preview</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                    className="h-8 text-xs rounded-xl gap-1.5 font-semibold bg-primary text-primary-foreground"
                    title="Experience candidate interface in simulator preview mode"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Interactive Preview</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Pending Evaluations */}
      {activeTab === "evaluations" && isStaff && (
        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/80 rounded-3xl bg-card text-muted-foreground text-xs">
              No submissions currently awaiting grading. All candidate submissions are evaluated!
            </div>
          ) : (
            evaluations.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="font-bold text-xs text-foreground">
                      {a.userName} ({a.userEmail}) • {a.department}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Assessment: <span className="font-semibold text-foreground">{a.testTitle}</span> • Submitted on{" "}
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "Recently"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Auto MCQ Score: {a.mcqScore}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleFinalizeEvaluation(a.id)}
                      className="rounded-xl h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Finalize & Release Result
                    </Button>
                  </div>
                </div>

                {/* Answers needing review */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Descriptive Submissions to Grade:
                  </span>
                  {Object.entries(a.answers || {}).map(([qId, ans], idx) => {
                    if (ans.selectedOptions && ans.selectedOptions.length > 0) return null; // skip MCQ
                    return (
                      <div
                        key={qId}
                        className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-2 text-xs"
                      >
                        <div className="flex justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">Question ID: {qId}</span>
                          <span>{ans.evaluated ? "Graded" : "Needs Grading"}</span>
                        </div>
                        <p className="p-3 rounded-lg bg-background border border-border/60 text-foreground whitespace-pre-wrap leading-relaxed">
                          {ans.descriptiveText || "(No response provided)"}
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Marks:</span>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              defaultValue={ans.marksAwarded || 0}
                              onChange={(e) =>
                                setEvalMarks((prev) => ({ ...prev, [qId]: Number(e.target.value) }))
                              }
                              className="w-16 h-7 px-2 rounded-lg bg-background border border-border/80 text-center font-bold"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Feedback comments..."
                            defaultValue={ans.feedback || ""}
                            onChange={(e) =>
                              setEvalFeedback((prev) => ({ ...prev, [qId]: e.target.value }))
                            }
                            className="flex-1 h-7 px-3 rounded-lg bg-background border border-border/80 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSaveGrade(a.id, qId)}
                            className="h-7 text-[11px] rounded-lg"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Results & Scorecards */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {results.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border/80 rounded-3xl bg-card text-muted-foreground text-xs">
                No finalized test scorecards yet.
              </div>
            ) : (
              results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground">{r.userName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {r.department}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">• {r.testTitle}</span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Completed: {new Date(r.completedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {r.totalScore} / {r.maxScore} ({r.percentage}%)
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold ${
                          r.passed
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {r.passed ? `PASSED (${r.grade})` : `FAILED (${r.grade})`}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Author Assessment */}
      {showCreateTestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-bold text-sm text-foreground">Author New Assessment</h3>
              <button
                onClick={() => setShowCreateTestModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full-Stack Node.js & React Competency"
                  value={newTest.title}
                  onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                  className="w-full h-8 px-3 rounded-xl bg-background border border-border/80"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Assessment scope and guidelines..."
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-background border border-border/80"
                />
              </div>

              {/* Candidate Assignment Mode */}
              <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/70">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-primary" /> Candidate Assignment:
                  </span>
                  <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border/80">
                    <button
                      type="button"
                      onClick={() => setNewTest({ ...newTest, targetType: "DEPARTMENT" })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        newTest.targetType === "DEPARTMENT"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Entire Department
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTest({ ...newTest, targetType: "SPECIFIC_USERS" })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        newTest.targetType === "SPECIFIC_USERS"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Specific Employees
                    </button>
                  </div>
                </div>

                {newTest.targetType === "DEPARTMENT" ? (
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground font-semibold">
                      Target Department *
                    </label>
                    <select
                      value={newTest.department || "All Departments"}
                      onChange={(e) => setNewTest({ ...newTest, department: e.target.value })}
                      className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {departmentList.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="text-muted-foreground">
                        Select Employees ({newTest.targetUserIds.length} chosen) *
                      </label>
                      {newTest.targetUserIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewTest({ ...newTest, targetUserIds: [] })}
                          className="text-rose-500 hover:underline text-[10px]"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Search employees by name, email, or dept..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full h-7 px-2.5 rounded-lg bg-background border border-border/80 text-xs"
                    />
                    <div className="max-h-32 overflow-y-auto border border-border/80 rounded-xl p-1.5 space-y-1 bg-background">
                      {availableUsers
                        .filter(
                          (u) =>
                            !userSearchQuery.trim() ||
                            u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            u.department.toLowerCase().includes(userSearchQuery.toLowerCase())
                        )
                        .map((u) => {
                          const isSelected = newTest.targetUserIds.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() =>
                                setNewTest((prev) => ({
                                  ...prev,
                                  targetUserIds: isSelected
                                    ? prev.targetUserIds.filter((id) => id !== u.id)
                                    : [...prev.targetUserIds, u.id],
                                }))
                              }
                              className={`p-1.5 rounded-lg border text-[11px] cursor-pointer flex items-center justify-between ${
                                isSelected
                                  ? "bg-primary/10 border-primary text-foreground font-semibold"
                                  : "border-border/60 text-muted-foreground hover:bg-muted/30"
                              }`}
                            >
                              <div>
                                <span className="font-semibold text-foreground">{u.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-1.5">
                                  ({u.department})
                                </span>
                              </div>
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-primary border-primary text-white" : "border-border"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Duration, Pass % and Max Attempts */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Duration (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={newTest.durationMinutes}
                    onChange={(e) =>
                      setNewTest({ ...newTest, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Pass %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTest.passPercentage}
                    onChange={(e) =>
                      setNewTest({ ...newTest, passPercentage: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-muted-foreground" /> Max Attempts
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newTest.maxAttempts}
                    onChange={(e) =>
                      setNewTest({ ...newTest, maxAttempts: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80 text-center font-bold"
                  />
                </div>
              </div>

              {/* Schedule: Start Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/70">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" /> Start Date (Unlock)
                  </label>
                  <input
                    type="datetime-local"
                    value={newTest.startDate}
                    onChange={(e) => setNewTest({ ...newTest, startDate: e.target.value })}
                    className="w-full h-8 px-2 rounded-xl bg-background border border-border/80 text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" /> Due Date (Deadline)
                  </label>
                  <input
                    type="datetime-local"
                    value={newTest.dueDate}
                    onChange={(e) => setNewTest({ ...newTest, dueDate: e.target.value })}
                    className="w-full h-8 px-2 rounded-xl bg-background border border-border/80 text-[11px]"
                  />
                </div>
              </div>

              {/* Proctoring Settings */}
              <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                <span className="font-bold text-foreground">Anti-Cheating Proctoring:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTest.requireFullscreen}
                    onChange={(e) =>
                      setNewTest({ ...newTest, requireFullscreen: e.target.checked })
                    }
                  />
                  <span>Require Fullscreen Mode</span>
                </label>
                <div className="flex items-center gap-2">
                  <span>Max Allowed Tab Switches:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newTest.maxViolationsAllowed}
                    onChange={(e) =>
                      setNewTest({ ...newTest, maxViolationsAllowed: Number(e.target.value) })
                    }
                    className="w-14 h-6 px-2 rounded-lg bg-background border border-border/80 text-center"
                  />
                </div>
              </div>

              {/* Enhanced Select Questions from Bank */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/20 border border-border/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-primary" />
                      Select Questions from Bank:
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold ${
                        newTest.selectedQuestionIds.length > 0
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {newTest.selectedQuestionIds.length} Chosen
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const filteredIds = filteredBankQuestions.map((q) => q.id);
                        setNewTest((prev) => ({
                          ...prev,
                          selectedQuestionIds: Array.from(
                            new Set([...prev.selectedQuestionIds, ...filteredIds])
                          ),
                        }));
                      }}
                      className="px-2 py-0.5 rounded-lg border border-border/80 bg-background text-muted-foreground hover:text-foreground font-medium"
                    >
                      Select All Filtered ({filteredBankQuestions.length})
                    </button>
                    {newTest.selectedQuestionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewTest((prev) => ({ ...prev, selectedQuestionIds: [] }))}
                        className="px-2 py-0.5 rounded-lg text-rose-500 hover:bg-rose-500/10 font-medium"
                      >
                        Clear ({newTest.selectedQuestionIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and Search Toolbar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6 relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search questions by text or keyword..."
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-2.5 rounded-xl bg-background border border-border/80 text-xs text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={questionTypeFilter}
                      onChange={(e) => setQuestionTypeFilter(e.target.value as any)}
                      className="w-full h-8 px-2 rounded-xl bg-background border border-border/80 text-[11px] font-semibold text-foreground cursor-pointer"
                    >
                      <option value="ALL">All Types</option>
                      <option value="MCQ">MCQ Only</option>
                      <option value="DESCRIPTIVE">Descriptive Only</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={questionTopicFilter}
                      onChange={(e) => setQuestionTopicFilter(e.target.value)}
                      className="w-full h-8 px-2 rounded-xl bg-background border border-border/80 text-[11px] font-semibold text-foreground cursor-pointer"
                    >
                      <option value="ALL">All Topics</option>
                      {availableTopics.map((top) => (
                        <option key={top} value={top}>
                          {top}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Questions List */}
                <div className="max-h-56 overflow-y-auto border border-border/80 rounded-2xl p-2 space-y-2 bg-background">
                  {filteredBankQuestions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs space-y-1">
                      <p className="font-semibold">No questions matching your filters</p>
                      <p className="text-[11px]">
                        Try adjusting your search query, type filter, or add new questions to the Question Bank.
                      </p>
                    </div>
                  ) : (
                    filteredBankQuestions.map((q) => {
                      const isChosen = newTest.selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => {
                            setNewTest((prev) => ({
                              ...prev,
                              selectedQuestionIds: isChosen
                                ? prev.selectedQuestionIds.filter((id) => id !== q.id)
                                : [...prev.selectedQuestionIds, q.id],
                            }));
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                            isChosen
                              ? "bg-primary/10 border-primary shadow-xs"
                              : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isChosen
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isChosen && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className={`text-[9px] px-1.5 py-0 font-bold ${
                                  q.type === "MCQ"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-purple-500/10 text-purple-600"
                                }`}
                              >
                                {q.type}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                                {q.topic}
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground ml-auto">
                                {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                              </span>
                            </div>

                            <p className="text-[11px] text-foreground font-medium line-clamp-2 leading-relaxed">
                              {q.text}
                            </p>

                            {q.type === "MCQ" && q.options && (
                              <div className="text-[10px] text-muted-foreground">
                                {q.options.length} options{" "}
                                {q.answerMode === "MULTIPLE"
                                  ? "• Multi-select"
                                  : "• Single choice"}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Live Marks & Passing Benchmark Bar */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Selected:</span>
                    <strong className="text-foreground">{newTest.selectedQuestionIds.length} Questions</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Total Marks:</span>
                    <strong className="text-primary font-bold">{totalSelectedMarks} Marks</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Passing ({newTest.passPercentage}%):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {passMarksRequired} Marks
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateTestModal(false)}
                  className="rounded-xl h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl h-8 bg-primary text-primary-foreground font-semibold"
                >
                  Publish Assessment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Question */}
      {showCreateQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-bold text-sm text-foreground">Add Question to Bank</h3>
              <button
                onClick={() => setShowCreateQuestionModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Type</label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, type: e.target.value as any })
                    }
                    className="w-full h-8 px-2 rounded-xl bg-background border border-border/80"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="DESCRIPTIVE">Descriptive</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Topic</label>
                  <input
                    type="text"
                    value={newQuestion.topic}
                    onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={newQuestion.maxMarks}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, maxMarks: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Question Text *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Enter the question prompt here..."
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-background border border-border/80"
                />
              </div>

              {newQuestion.type === "MCQ" && (
                <div className="space-y-2">
                  <label className="font-medium text-muted-foreground">
                    Options & Correct Answer:
                  </label>
                  {newQuestion.options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={newQuestion.correctOptionId === opt.id}
                        onChange={() => setNewQuestion({ ...newQuestion, correctOptionId: opt.id })}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={opt.text}
                        onChange={(e) => {
                          const updated = [...newQuestion.options];
                          updated[i].text = e.target.value;
                          setNewQuestion({ ...newQuestion, options: updated });
                        }}
                        className="flex-1 h-7 px-2.5 rounded-lg bg-background border border-border/80"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Select the radio button beside the correct option.
                  </p>
                </div>
              )}

              {newQuestion.type === "DESCRIPTIVE" && (
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">
                    Reference Model Answer (for Evaluator)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Key concepts, terms, or model solution..."
                    value={newQuestion.referenceAnswer}
                    onChange={(e) =>
                      setNewQuestion({ ...newQuestion, referenceAnswer: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateQuestionModal(false)}
                  className="rounded-xl h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl h-8 bg-primary text-primary-foreground font-semibold"
                >
                  Save Question
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Test Preview */}
      {previewTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{previewTest.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {previewTest.department || "General"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {previewTest.status || "active"}
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewTest(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Test Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70 font-mono text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Duration</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" /> {previewTest.durationMinutes} mins
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Total Marks</span>
                <span className="font-bold text-foreground">{previewTest.totalMarks || 0} Marks</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Pass Benchmark</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {previewTest.passPercentage}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Questions</span>
                <span className="font-bold text-foreground">
                  {previewQuestions.length || previewTest.questionIds?.length || 0} Questions
                </span>
              </div>
            </div>

            {previewTest.description && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {previewTest.description}
              </p>
            )}

            {/* Proctoring Rules Summary */}
            <div className="p-3 rounded-xl bg-background border border-border/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Anti-Cheating Rules:
              </span>
              <span className="text-muted-foreground">
                Fullscreen: {previewTest.proctoring?.requireFullscreen ? "Mandatory" : "Optional"} • Max Tab Switches: {previewTest.proctoring?.maxViolationsAllowed || 3} • Auto-Submit on Expiry
              </span>
            </div>

            {/* Questions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Test Questions Preview ({previewQuestions.length})
                </span>
                {isStaff && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                    Staff View with Answer Keys
                  </Badge>
                )}
              </div>

              {loadingPreview ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  <span className="text-xs text-muted-foreground">Loading questions...</span>
                </div>
              ) : previewQuestions.length === 0 ? (
                <div className="p-6 text-center border border-dashed rounded-2xl text-muted-foreground text-xs">
                  No questions linked to this assessment yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {previewQuestions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3.5 rounded-2xl border border-border/80 bg-background space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              q.type === "MCQ"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-purple-500/10 text-purple-600"
                            }`}
                          >
                            {q.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {q.topic}
                          </Badge>
                        </div>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          {q.maxMarks} {q.maxMarks === 1 ? "Mark" : "Marks"}
                        </span>
                      </div>

                      <p className="font-medium text-foreground whitespace-pre-wrap">{q.text}</p>

                      {q.type === "MCQ" && q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = q.correctOptions?.includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={`p-2 rounded-xl border flex items-center justify-between text-[11px] ${
                                  isCorrect && isStaff
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                                    : "bg-muted/30 border-border/60 text-muted-foreground"
                                }`}
                              >
                                <span>{opt.text}</span>
                                {isCorrect && isStaff && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "DESCRIPTIVE" && q.referenceAnswer && isStaff && (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground space-y-0.5">
                          <span className="font-bold text-foreground">Model Answer: </span>
                          <p>{q.referenceAnswer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/80">
              <Button
                variant="outline"
                onClick={() => setPreviewTest(null)}
                className="w-full sm:w-auto rounded-xl h-9 text-xs"
              >
                Close Preview
              </Button>

              <Button
                onClick={() => {
                  setPreviewTest(null);
                  router.push(`/hrms/tests/take/${previewTest.id}`);
                }}
                className="w-full sm:w-auto rounded-xl h-9 text-xs font-semibold bg-primary text-primary-foreground gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isStaff ? "Launch Interactive Candidate Preview" : "Start Assessment"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Drawer / Modal: Candidate Progress & Retakes */}
      {candidateProgressTest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Candidate Progress &amp; Retakes
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Assessment:{" "}
                    <span className="font-semibold text-foreground">
                      {candidateProgressTest.title}
                    </span>{" "}
                    • Max Attempts: {candidateProgressTest.maxAttempts || 1}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCandidateProgressTest(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {loadingCandidateProgress ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <span className="text-xs text-muted-foreground">
                  Loading candidate progress...
                </span>
              </div>
            ) : candidateProgressList.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-2xl text-muted-foreground text-xs">
                No targeted candidates found for this assessment.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>
                    Total Assigned: <strong>{candidateProgressList.length}</strong> • Completed:{" "}
                    <strong>
                      {candidateProgressList.filter((c) => c.status === "evaluated").length}
                    </strong>
                  </span>
                  <span>Highest score is automatically recorded</span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {candidateProgressList.map((c) => (
                    <div
                      key={c.userId}
                      className="p-3.5 rounded-2xl border border-border/80 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{c.name}</span>
                          <span className="text-[10px] text-muted-foreground">({c.email})</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.department}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>
                            Attempts Used:{" "}
                            <strong className="text-foreground">
                              {c.attemptsUsed} / {c.maxAttemptsAllowed}
                            </strong>
                          </span>
                          {c.bestScore !== undefined && (
                            <>
                              <span>•</span>
                              <span>
                                Best Score:{" "}
                                <strong className="text-foreground font-mono">
                                  {c.bestScore} / {c.maxScore} ({c.percentage}%)
                                </strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold capitalize ${
                            c.status === "evaluated"
                              ? c.passed
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-rose-500/10 text-rose-600"
                              : c.status === "in_progress"
                              ? "bg-blue-500/10 text-blue-600"
                              : c.status === "submitted"
                              ? "bg-purple-500/10 text-purple-600"
                              : c.status === "overdue"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {c.status === "evaluated"
                            ? c.passed
                              ? "Passed"
                              : "Failed"
                            : c.status.replace("_", " ")}
                        </Badge>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={grantingRetakeUserId === c.userId}
                          onClick={() =>
                            handleGrantRetake(candidateProgressTest.id, c.userId)
                          }
                          className="rounded-xl h-7 text-[11px] gap-1 font-semibold hover:border-primary hover:text-primary"
                          title="Grant 1 additional attempt to this employee"
                        >
                          {grantingRetakeUserId === c.userId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3 text-primary" />
                          )}
                          <span>+1 Retake</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-border/80">
              <Button
                variant="outline"
                onClick={() => setCandidateProgressTest(null)}
                className="rounded-xl h-8 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
