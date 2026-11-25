"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  ShieldAlert,
  Loader2,
  Bookmark,
  Check,
  ArrowLeft,
  Eye,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  type: "MCQ" | "DESCRIPTIVE";
  text: string;
  topic: string;
  options?: Array<{ id: string; text: string }>;
  correctOptions?: string[];
  referenceAnswer?: string;
  answerMode?: "SINGLE" | "MULTIPLE";
  maxMarks: number;
}

interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  expiresAt: string;
  status: string;
  violationCount: number;
  answers: Record<string, { selectedOptions?: string[]; descriptiveText?: string }>;
}

function TestRunnerContent() {
  const params = useParams();
  const testId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const isStaff =
    user?.role === "manager" ||
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "hr_admin";

  // Managers author & review assessments; they view in Preview Mode rather than real candidate attempts
  const isPreview = isStaff;

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [descriptiveText, setDescriptiveText] = useState("");
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());

  // In-memory answers for preview mode
  const [previewAnswers, setPreviewAnswers] = useState<
    Record<string, { selectedOptions?: string[]; descriptiveText?: string }>
  >({});
  const [showAnswerKey, setShowAnswerKey] = useState(true);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [violationWarning, setViolationWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);

  // Initialize or resume test attempt (or load preview for staff)
  useEffect(() => {
    if (authLoading) return;

    async function init() {
      try {
        setLoading(true);

        // 1. Fetch test details
        const testRes = await fetch(`/api/hrm/v2/tests/${testId}`);
        const testData = await testRes.json();
        if (!testRes.ok || !testData.success) {
          console.error(testData.error || "Failed to load test");
          router.push("/hrms/tests");
          return;
        }

        setTest(testData.data);
        const testQuestions: Question[] = testData.data.questions || [];
        setQuestions(testQuestions);

        // 2. In Preview Mode (Staff / Manager), do NOT create candidate attempt in MySQL
        if (isPreview) {
          setSecondsRemaining((testData.data.durationMinutes || 30) * 60);
          setLoading(false);
          return;
        }

        // 3. Candidate / Employee mode: Start or resume real attempt
        const attemptRes = await fetch("/api/hrm/v2/tests/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
        });
        const attemptData = await attemptRes.json();
        if (!attemptRes.ok || !attemptData.success) {
          console.error(attemptData.error || "Could not start test");
          router.push("/hrms/tests");
          return;
        }

        const att = attemptData.data;
        setAttempt(att);
        setViolationCount(att.violationCount || 0);

        // Calculate timer
        const expiry = new Date(att.expiresAt).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.max(0, Math.floor((expiry - now) / 1000));
        setSecondsRemaining(diffSeconds);

        // Load existing answer for question 0 if available
        if (testQuestions.length > 0) {
          const firstQ = testQuestions[0];
          const existingAns = att.answers?.[firstQ.id];
          if (existingAns) {
            setSelectedOptions(existingAns.selectedOptions || []);
            setDescriptiveText(existingAns.descriptiveText || "");
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (testId) init();
  }, [testId, router, isPreview, authLoading]);

  // Countdown Timer
  useEffect(() => {
    if (secondsRemaining <= 0 || submitted) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isPreview) {
            handleSubmitTest(true); // Auto-submit on expiry for candidates
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining, submitted, isPreview]);

  // Anti-cheating: detect tab visibility loss (candidates only)
  useEffect(() => {
    if (isPreview || !test?.proctoring || submitted) return;

    const handleVisibilityChange = async () => {
      if (document.hidden && attempt) {
        try {
          const res = await fetch(`/api/hrm/v2/tests/attempts/${attempt.id}/violation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Tab switch / window focus lost" }),
          });
          const data = await res.json();
          if (data.success) {
            const count = data.data.violationCount;
            setViolationCount(count);
            if (data.data.locked) {
              alert("Proctoring violation limit reached. Your test attempt has been locked.");
              router.push("/hrms/tests");
            } else {
              setViolationWarning(
                `Warning: Focus loss detected (${count}/${test.proctoring.maxViolationsAllowed}). Please remain in this tab.`
              );
            }
          }
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [test, attempt, submitted, router, isPreview]);

  // Auto-save current answer
  const saveCurrentAnswer = async (qIndex = currentIndex) => {
    if (!questions[qIndex]) return;
    const q = questions[qIndex];

    if (isPreview) {
      // In-memory save for preview
      setPreviewAnswers((prev) => ({
        ...prev,
        [q.id]: { selectedOptions, descriptiveText },
      }));
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      return;
    }

    if (!attempt) return;
    setAutoSaving(true);
    try {
      await fetch(`/api/hrm/v2/tests/attempts/${attempt.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          selectedOptions,
          descriptiveText,
        }),
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      // ignore
    } finally {
      setAutoSaving(false);
    }
  };

  // Switch Question
  const handleSelectQuestion = async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length || targetIndex === currentIndex) return;
    await saveCurrentAnswer(currentIndex);

    setCurrentIndex(targetIndex);
    const targetQ = questions[targetIndex];

    if (isPreview) {
      const saved = previewAnswers[targetQ.id];
      setSelectedOptions(saved?.selectedOptions || []);
      setDescriptiveText(saved?.descriptiveText || "");
      return;
    }

    const saved = attempt?.answers?.[targetQ.id];
    setSelectedOptions(saved?.selectedOptions || []);
    setDescriptiveText(saved?.descriptiveText || "");
  };

  // Option selection
  const handleOptionToggle = (optionId: string) => {
    const q = questions[currentIndex];
    if (q.answerMode === "MULTIPLE") {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  // Toggle flag
  const toggleFlag = () => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  };

  // Submit test or Exit preview
  const handleSubmitTest = async (isAuto = false) => {
    if (isPreview) {
      if (confirm("Exit test preview mode and return to the Assessment workspace?")) {
        router.push("/hrms/tests");
      }
      return;
    }

    if (!attempt || submitting || submitted) return;
    if (!isAuto && !confirm("Are you sure you want to finalize and submit your test?")) return;

    setSubmitting(true);
    try {
      await saveCurrentAnswer();
      const res = await fetch(`/api/hrm/v2/tests/attempts/${attempt.id}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(data.data);
      } else {
        alert(data.error || "Failed to submit test");
      }
    } catch (err: any) {
      alert(err.message || "Submission error");
    } finally {
      setSubmitting(false);
    }
  };

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {isPreview ? "Loading assessment preview..." : "Preparing proctored test environment..."}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border/80 rounded-3xl p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Assessment Submitted</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your responses have been recorded in the secure HRMS assessment ledger.
            </p>
          </div>

          <div className="bg-muted/40 p-4 rounded-2xl border border-border/60 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-semibold capitalize text-foreground">{submitted.status}</span>
            </div>
            {submitted.status === "evaluated" && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-bold text-foreground">
                    {submitted.totalScore} / {submitted.maxScore} ({submitted.percentage}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Result:</span>
                  <span className={`font-bold ${submitted.passed ? "text-emerald-600" : "text-rose-600"}`}>
                    {submitted.passed ? "PASSED" : "FAILED"}
                  </span>
                </div>
              </>
            )}
            {submitted.status === "submitted" && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                This test contains descriptive questions awaiting manual grading by your manager. Results will appear in your Results tab once graded.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/hrms")}
              className="flex-1 rounded-xl font-semibold h-10 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to HRMS
            </Button>
            <Button
              onClick={() => router.push("/hrms/tests")}
              className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold h-10 text-xs"
            >
              Assessment Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const answeredCount = isPreview
    ? Object.keys(previewAnswers).length
    : Object.keys(attempt?.answers || {}).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none">
      {/* Top Proctored / Preview Banner */}
      <header className="h-14 border-b border-border/80 bg-card px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (isPreview) {
                router.push("/hrms/tests");
                return;
              }
              if (confirm("Return to HRMS? Your draft answers will be saved.")) {
                await saveCurrentAnswer();
                router.push("/hrms");
              }
            }}
            className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 border border-border/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPreview ? "Exit to Portal" : "Return to HRMS"}</span>
          </Button>

          <span className="font-bold text-sm tracking-tight">{test?.title}</span>

          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
            {test?.department} • {test?.category}
          </Badge>

          {isPreview && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[11px] font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>Manager Preview Mode</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Answer Key Toggle for Staff */}
          {isPreview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              className={`h-8 text-xs rounded-xl gap-1.5 font-medium ${
                showAnswerKey ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : ""
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">{showAnswerKey ? "Hide Answer Key" : "Show Answer Key"}</span>
            </Button>
          )}

          {/* Auto-save indicator */}
          <div className="text-[11px] text-muted-foreground hidden md:flex items-center gap-1.5">
            {autoSaving ? (
              <span className="text-amber-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving draft...
              </span>
            ) : lastSaved ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved at {lastSaved}
              </span>
            ) : null}
          </div>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold border ${
              secondsRemaining < 300
                ? "bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse"
                : "bg-muted text-foreground border-border/80"
            }`}
            title={isPreview ? "Candidate Time Limit Simulator" : "Remaining Time"}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {isPreview ? (
            <Button
              size="sm"
              onClick={() => handleSubmitTest(false)}
              className="rounded-xl h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1"
            >
              <span>Exit Preview</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleSubmitTest(false)}
              disabled={submitting}
              className="rounded-xl h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Submit Test
            </Button>
          )}
        </div>
      </header>

      {/* Preview Info Notice Banner */}
      {isPreview && (
        <div className="bg-purple-500/10 border-b border-purple-500/20 px-4 py-2 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 shrink-0 text-purple-600" />
            <span>
              <strong>Assessment Preview Mode:</strong> You are inspecting this test as an author/reviewer. Responses are simulated in-memory and will not create test records or trigger anti-cheating lockouts.
            </span>
          </div>
          <button
            onClick={() => router.push("/hrms/tests")}
            className="text-[11px] font-bold underline shrink-0 ml-4 hover:text-purple-900 dark:hover:text-purple-100"
          >
            Return to Assessments
          </button>
        </div>
      )}

      {/* Violation Alert Banner (Candidates only) */}
      {!isPreview && violationWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{violationWarning}</span>
          </div>
          <button
            onClick={() => setViolationWarning(null)}
            className="text-[10px] font-bold uppercase underline"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Runner Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Question Content View */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Question {currentIndex + 1} of {questions.length} • {currentQ?.topic}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleFlag}
                className={`h-7 px-2 text-[11px] rounded-lg gap-1 ${
                  flaggedQuestions.has(currentIndex)
                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className="w-3 h-3" />
                {flaggedQuestions.has(currentIndex) ? "Flagged" : "Flag for Review"}
              </Button>
              <Badge variant="outline" className="text-[10px]">
                {currentQ?.maxMarks} {currentQ?.maxMarks === 1 ? "Mark" : "Marks"}
              </Badge>
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">
              {currentQ?.text}
            </h3>
          </div>

          {/* MCQ Options */}
          {currentQ?.type === "MCQ" && currentQ.options && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground font-medium">
                {currentQ.answerMode === "MULTIPLE"
                  ? "Select all that apply:"
                  : "Select one option:"}
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  const isCorrectAnswer = currentQ.correctOptions?.includes(opt.id);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOptionToggle(opt.id)}
                      className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground font-semibold shadow-xs"
                          : isPreview && showAnswerKey && isCorrectAnswer
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-semibold"
                          : "bg-card border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span>{opt.text}</span>
                        {isPreview && showAnswerKey && isCorrectAnswer && (
                          <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            ✓ Correct Answer
                          </Badge>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 rounded-${
                          currentQ.answerMode === "MULTIPLE" ? "md" : "full"
                        } border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descriptive Text Answer */}
          {currentQ?.type === "DESCRIPTIVE" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">
                  Type your comprehensive response below:
                </label>
                <textarea
                  value={descriptiveText}
                  onChange={(e) => setDescriptiveText(e.target.value)}
                  rows={8}
                  placeholder="Write your explanation here..."
                  className="w-full rounded-2xl bg-card border border-border/80 p-4 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed shadow-xs"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{isPreview ? "Simulated input in preview" : "Auto-saves as you write"}</span>
                  <span>{descriptiveText.length} characters</span>
                </div>
              </div>

              {/* Model / Reference Answer box for Staff */}
              {isPreview && showAnswerKey && currentQ.referenceAnswer && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Model Reference Solution (For Evaluator):</span>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {currentQ.referenceAnswer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border/80">
            <Button
              size="sm"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => handleSelectQuestion(currentIndex - 1)}
              className="rounded-xl h-8 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>

            <Button
              size="sm"
              variant="default"
              disabled={currentIndex === questions.length - 1}
              onClick={() => handleSelectQuestion(currentIndex + 1)}
              className="rounded-xl h-8 text-xs gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <aside className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border/80 bg-card p-5 shrink-0 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Question Palette
              </span>
              <span className="text-[11px] text-muted-foreground">
                {answeredCount} of {questions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = isPreview
                  ? (previewAnswers[q.id]?.selectedOptions && previewAnswers[q.id].selectedOptions!.length > 0) ||
                    (previewAnswers[q.id]?.descriptiveText && previewAnswers[q.id].descriptiveText!.trim().length > 0) ||
                    (idx === currentIndex && (selectedOptions.length > 0 || descriptiveText.trim().length > 0))
                  : (attempt?.answers?.[q.id]?.selectedOptions &&
                      attempt.answers[q.id].selectedOptions!.length > 0) ||
                    (attempt?.answers?.[q.id]?.descriptiveText &&
                      attempt.answers[q.id].descriptiveText!.trim().length > 0) ||
                    (idx === currentIndex && (selectedOptions.length > 0 || descriptiveText.trim().length > 0));
                const isFlagged = flaggedQuestions.has(idx);

                return (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuestion(idx)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center ${
                      isCurrent
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background font-extrabold"
                        : ""
                    } ${
                      isAnswered
                        ? "bg-emerald-600 text-white"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-card" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 pt-4 border-t border-border/80 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-muted" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span>Flagged for Review</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/80 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1 text-foreground font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" />
              <span>{isPreview ? "Preview Simulation" : "Proctored Session"}</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              {isPreview
                ? "Simulating candidate test experience with zero database mutation."
                : "Window focus and tab switches are logged. Submitting will record your final responses."}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function TestRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        </div>
      }
    >
      <TestRunnerContent />
    </Suspense>
  );
}
