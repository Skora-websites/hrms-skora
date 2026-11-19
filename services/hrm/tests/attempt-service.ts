import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TestAttempt, AttemptStatus, TestAnswer } from "./types";
import { getTestById } from "./test-service";
import { getQuestions } from "./question-service";

export async function startAttempt(
  tenantId: string = "default",
  testId: string,
  user: { userId: string; userName: string; userEmail: string; department?: string }
): Promise<TestAttempt> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const test = await getTestById(tenantId, testId, {
    userId: user.userId,
    role: "employee",
    department: user.department,
  });

  if (!test) throw new Error("Test not found");
  if (test.status !== "active") throw new Error("Test is not currently active");

  // Check if candidate already has an active attempt
  const existing = await db.collection("test_attempts").findOne({
    tenantId,
    testId,
    userId: user.userId,
    status: "in_progress",
  });

  if (existing) {
    const now = new Date().getTime();
    const expiry = new Date(existing.expiresAt).getTime();
    if (now < expiry) {
      return {
        id: existing._id ? existing._id.toString() : String(existing.id),
        ...existing,
      };
    } else {
      // Auto-expire
      await db.collection("test_attempts").updateOne(
        { _id: existing._id },
        { $set: { status: "timed_out" } }
      );
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + test.durationMinutes * 60 * 1000);

  const attemptDoc = {
    tenantId,
    testId,
    testTitle: test.title,
    userId: user.userId,
    userName: user.userName,
    userEmail: user.userEmail,
    department: user.department || "General",
    status: "in_progress" as AttemptStatus,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    answers: {},
    violationCount: 0,
    violationLogs: [],
    mcqScore: 0,
    descriptiveScore: 0,
    totalScore: 0,
    maxScore: test.totalMarks,
    percentage: 0,
    passed: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const res = await db.collection("test_attempts").insertOne(attemptDoc as any);
  return {
    id: res.insertedId.toString(),
    ...attemptDoc,
  };
}

export async function saveAnswerDraft(
  tenantId: string = "default",
  attemptId: string,
  questionId: string,
  answer: { selectedOptions?: string[]; descriptiveText?: string },
  userId: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const attempt = await db.collection("test_attempts").findOne({
    tenantId,
    _id: ObjectId.isValid(attemptId) ? new ObjectId(attemptId) : attemptId,
    userId,
  });

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "in_progress") {
    throw new Error("Attempt is no longer in progress");
  }

  const now = new Date();
  if (now.getTime() > new Date(attempt.expiresAt).getTime()) {
    await db.collection("test_attempts").updateOne(
      { _id: attempt._id },
      { $set: { status: "timed_out", updatedAt: now.toISOString() } }
    );
    throw new Error("Time expired for this test");
  }

  const currentAnswers = attempt.answers || {};
  currentAnswers[questionId] = {
    questionId,
    selectedOptions: answer.selectedOptions || [],
    descriptiveText: answer.descriptiveText || "",
    updatedAt: now.toISOString(),
  };

  await db.collection("test_attempts").updateOne(
    { _id: attempt._id },
    {
      $set: {
        answers: currentAnswers,
        updatedAt: now.toISOString(),
      },
    }
  );

  return true;
}

export async function logViolation(
  tenantId: string = "default",
  attemptId: string,
  reason: string,
  userId: string
): Promise<{ violationCount: number; locked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const attempt = await db.collection("test_attempts").findOne({
    tenantId,
    _id: ObjectId.isValid(attemptId) ? new ObjectId(attemptId) : attemptId,
    userId,
  });

  if (!attempt) throw new Error("Attempt not found");

  const test = await db.collection("test_definitions").findOne({
    tenantId,
    _id: ObjectId.isValid(attempt.testId) ? new ObjectId(attempt.testId) : attempt.testId,
  });

  const maxAllowed = test?.proctoring?.maxViolationsAllowed ?? 3;
  const shouldLock = test?.proctoring?.lockOnViolationExceeded ?? true;

  const newCount = (attempt.violationCount || 0) + 1;
  const logs = attempt.violationLogs || [];
  logs.push({ reason, timestamp: new Date().toISOString() });

  const patch: any = {
    violationCount: newCount,
    violationLogs: logs,
    updatedAt: new Date().toISOString(),
  };

  const locked = newCount >= maxAllowed && shouldLock;
  if (locked) {
    patch.status = "locked";
  }

  await db.collection("test_attempts").updateOne({ _id: attempt._id }, { $set: patch });
  return { violationCount: newCount, locked };
}

export async function submitAttempt(
  tenantId: string = "default",
  attemptId: string,
  userId: string
): Promise<TestAttempt> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const attempt = await db.collection("test_attempts").findOne({
    tenantId,
    _id: ObjectId.isValid(attemptId) ? new ObjectId(attemptId) : attemptId,
    userId,
  });

  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "in_progress" && attempt.status !== "timed_out") {
    throw new Error("Attempt is already submitted or evaluated");
  }

  const test = await db.collection("test_definitions").findOne({
    tenantId,
    _id: ObjectId.isValid(attempt.testId) ? new ObjectId(attempt.testId) : attempt.testId,
  });

  const allQuestions = await getQuestions(tenantId);
  const qMap = new Map(allQuestions.map((q) => [q.id, q]));

  let mcqScore = 0;
  let hasDescriptive = false;
  const answers: Record<string, TestAnswer> = attempt.answers || {};

  for (const qId of (test?.questionIds || [])) {
    const q = qMap.get(qId);
    if (!q) continue;

    const userAns = answers[qId];
    if (q.type === "MCQ") {
      const correct = q.correctOptions || [];
      const selected = userAns?.selectedOptions || [];
      const isCorrect =
        correct.length === selected.length &&
        correct.every((opt) => selected.includes(opt));

      const marksAwarded = isCorrect ? q.maxMarks : 0;
      mcqScore += marksAwarded;

      answers[qId] = {
        questionId: qId,
        selectedOptions: selected,
        marksAwarded,
        evaluated: true,
        updatedAt: new Date().toISOString(),
      };
    } else if (q.type === "DESCRIPTIVE") {
      hasDescriptive = true;
      answers[qId] = {
        questionId: qId,
        descriptiveText: userAns?.descriptiveText || "",
        marksAwarded: 0,
        evaluated: false,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const nowIso = new Date().toISOString();
  const maxScore = test?.totalMarks || 100;
  const passPercentage = test?.passPercentage || 60;

  let finalStatus: AttemptStatus = hasDescriptive ? "submitted" : "evaluated";
  let totalScore = mcqScore;
  let percentage = Math.round((totalScore / (maxScore || 1)) * 100);
  let passed = percentage >= passPercentage;

  const patch: any = {
    answers,
    mcqScore,
    totalScore,
    percentage,
    passed,
    status: finalStatus,
    submittedAt: nowIso,
    updatedAt: nowIso,
  };

  await db.collection("test_attempts").updateOne({ _id: attempt._id }, { $set: patch });

  // If pure MCQ (no descriptive questions to grade), insert into test_results immediately
  if (!hasDescriptive) {
    const grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 65 ? "B" : percentage >= 50 ? "C" : "F";
    await db.collection("test_results").insertOne({
      tenantId,
      attemptId,
      testId: attempt.testId,
      testTitle: attempt.testTitle,
      userId: attempt.userId,
      userName: attempt.userName,
      userEmail: attempt.userEmail,
      department: attempt.department,
      totalScore,
      maxScore,
      percentage,
      passed,
      grade,
      completedAt: nowIso,
      createdAt: nowIso,
    } as any);
  }

  return {
    ...attempt,
    ...patch,
    id: attempt._id.toString(),
  };
}

export async function getAttemptById(
  tenantId: string = "default",
  attemptId: string,
  userId?: string
): Promise<TestAttempt | null> {
  const db = await getDb();
  if (!db) return null;

  const query: any = {
    tenantId,
    _id: ObjectId.isValid(attemptId) ? new ObjectId(attemptId) : attemptId,
  };
  if (userId) query.userId = userId;

  const a = await db.collection("test_attempts").findOne(query);
  if (!a) return null;

  return {
    id: a._id ? a._id.toString() : String(a.id),
    tenantId: a.tenantId,
    testId: a.testId,
    testTitle: a.testTitle,
    userId: a.userId,
    userName: a.userName,
    userEmail: a.userEmail,
    department: a.department,
    status: a.status,
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    submittedAt: a.submittedAt,
    answers: a.answers || {},
    violationCount: a.violationCount || 0,
    violationLogs: a.violationLogs || [],
    mcqScore: a.mcqScore || 0,
    descriptiveScore: a.descriptiveScore || 0,
    totalScore: a.totalScore || 0,
    maxScore: a.maxScore || 100,
    percentage: a.percentage || 0,
    passed: a.passed || false,
    evaluatedBy: a.evaluatedBy,
    evaluatedAt: a.evaluatedAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}
