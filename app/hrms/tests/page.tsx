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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";
import type { TestDefinition, TestQuestion, TestResultSummary, TestAttempt } from "@/services/hrm/tests/types";

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

  // Form state for new test
  const [newTest, setNewTest] = useState({
    title: "",
    description: "",
    department: "",
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

      // 3. If staff, fetch questions and evaluations
      if (isStaff) {
        const qRes = await fetch("/api/hrm/v2/tests/questions");
        const qJson = await qRes.json();
        if (qJson.success) setQuestions(qJson.data || []);

        const evalRes = await fetch("/api/hrm/v2/tests/evaluations");
        const evalJson = await evalRes.json();
        if (evalJson.success) setEvaluations(evalJson.data || []);
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

    try {
      const payload = {
        title: newTest.title,
        description: newTest.description,
        department: newTest.department || "General",
        durationMinutes: Number(newTest.durationMinutes),
        passPercentage: Number(newTest.passPercentage),
        questionIds: newTest.selectedQuestionIds,
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
          department: "",
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
              tests.map((t) => (
                <div
                  key={t.id}
                  className="rounded-3xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t.department} • {t.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {t.durationMinutes}m
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground">{t.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t.description || "Comprehensive assessment covering core domain skills."}
                    </p>
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
                      <Button
                        size="sm"
                        onClick={() => router.push(`/hrms/tests/take/${t.id}`)}
                        className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start Test
                      </Button>
                    </div>
                  </div>
                </div>
              ))
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
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">{t.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {t.department}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold capitalize"
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>{t.durationMinutes} mins</span>
                    <span>•</span>
                    <span>{t.questionIds?.length || 0} questions</span>
                    <span>•</span>
                    <span>Total Marks: {t.totalMarks}</span>
                    <span>•</span>
                    <span>Pass: {t.passPercentage}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
          <div className="bg-card border border-border/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
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

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Target Dept</label>
                  <input
                    type="text"
                    placeholder="Engineering"
                    value={newTest.department}
                    onChange={(e) => setNewTest({ ...newTest, department: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-xl bg-background border border-border/80"
                  />
                </div>
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

              {/* Select Questions */}
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">
                  Select Questions from Bank ({newTest.selectedQuestionIds.length} chosen) *
                </label>
                <div className="max-h-40 overflow-y-auto border border-border/80 rounded-xl p-2 space-y-1.5 bg-background">
                  {questions.length === 0 ? (
                    <p className="text-muted-foreground p-2">
                      No questions in bank. Create questions first.
                    </p>
                  ) : (
                    questions.map((q) => {
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
                          className={`p-2 rounded-lg border text-[11px] cursor-pointer flex items-center justify-between ${
                            isChosen
                              ? "bg-primary/10 border-primary text-foreground font-semibold"
                              : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          <span className="line-clamp-1 flex-1">
                            [{q.type}] {q.text}
                          </span>
                          <span className="font-mono ml-2 shrink-0">{q.maxMarks}m</span>
                        </div>
                      );
                    })
                  )}
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
    </div>
  );
}
