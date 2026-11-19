import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TestAttempt, TestResultSummary } from "./types";
import { getAttemptById } from "./attempt-service";
import { getTestById } from "./test-service";

export async function getPendingEvaluations(
  tenantId: string = "default",
  caller: { userId: string; role: string; department?: string }
): Promise<TestAttempt[]> {
  const db = await getDb();
  if (!db) return [];

  const query: any = {
    tenantId,
    status: "submitted",
  };

  const isSuperAdmin = caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (!isSuperAdmin) {
    if (isManager && userDept) {
      query.department = userDept;
    } else {
      return [];
    }
  }

  const docs = await db
    .collection("test_attempts")
    .find(query)
    .sort({ submittedAt: 1 })
    .toArray();

  return (docs as any[]).map((a) => ({
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
  }));
}

export async function gradeDescriptiveAnswer(
  tenantId: string = "default",
  input: {
    attemptId: string;
    questionId: string;
    marksAwarded: number;
    feedback?: string;
  },
  evaluator: { userId: string; userName: string; role: string }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const attempt = await getAttemptById(tenantId, input.attemptId);
  if (!attempt) throw new Error("Attempt not found");

  const answers = attempt.answers || {};
  const current = answers[input.questionId] || { questionId: input.questionId };

  answers[input.questionId] = {
    ...current,
    marksAwarded: Number(input.marksAwarded || 0),
    evaluated: true,
    feedback: input.feedback || "",
    updatedAt: new Date().toISOString(),
  };

  await db.collection("test_attempts").updateOne(
    {
      tenantId,
      _id: ObjectId.isValid(input.attemptId) ? new ObjectId(input.attemptId) : input.attemptId,
    },
    {
      $set: {
        answers,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return true;
}

export async function finalizeEvaluation(
  tenantId: string = "default",
  attemptId: string,
  evaluator: { userId: string; userName: string; role: string; department?: string }
): Promise<TestResultSummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const attempt = await getAttemptById(tenantId, attemptId);
  if (!attempt) throw new Error("Attempt not found");

  const test = await getTestById(tenantId, attempt.testId, evaluator);
  if (!test) throw new Error("Parent test not found");

  // Sum total marks from all answers
  let mcqTotal = 0;
  let descriptiveTotal = 0;

  for (const ans of Object.values(attempt.answers || {})) {
    if (ans.selectedOptions && ans.selectedOptions.length > 0) {
      mcqTotal += ans.marksAwarded || 0;
    } else {
      descriptiveTotal += ans.marksAwarded || 0;
    }
  }

  const totalScore = mcqTotal + descriptiveTotal;
  const maxScore = test.totalMarks || 100;
  const percentage = Math.round((totalScore / (maxScore || 1)) * 100);
  const passed = percentage >= (test.passPercentage || 60);
  const grade =
    percentage >= 90
      ? "A+"
      : percentage >= 80
      ? "A"
      : percentage >= 65
      ? "B"
      : percentage >= 50
      ? "C"
      : "F";

  const nowIso = new Date().toISOString();

  await db.collection("test_attempts").updateOne(
    {
      tenantId,
      _id: ObjectId.isValid(attemptId) ? new ObjectId(attemptId) : attemptId,
    },
    {
      $set: {
        status: "evaluated",
        mcqScore: mcqTotal,
        descriptiveScore: descriptiveTotal,
        totalScore,
        percentage,
        passed,
        evaluatedBy: evaluator.userName,
        evaluatedAt: nowIso,
        updatedAt: nowIso,
      },
    }
  );

  // Write to test_results
  const resultDoc = {
    tenantId,
    attemptId,
    testId: attempt.testId,
    testTitle: attempt.testTitle,
    userId: attempt.userId,
    userName: attempt.userName,
    userEmail: attempt.userEmail,
    department: attempt.department || "General",
    totalScore,
    maxScore,
    percentage,
    passed,
    grade,
    completedAt: nowIso,
    createdAt: nowIso,
  };

  const res = await db.collection("test_results").insertOne(resultDoc as any);

  return {
    id: res.insertedId.toString(),
    ...resultDoc,
  };
}
