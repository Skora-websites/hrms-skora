import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TestResultSummary } from "./types";

export async function getResults(
  tenantId: string = "default",
  caller: { userId: string; role: string; department?: string },
  filter: { testId?: string; search?: string } = {}
): Promise<TestResultSummary[]> {
  const db = await getDb();
  if (!db) return [];

  const query: any = { tenantId };
  if (filter.testId && filter.testId !== "all") query.testId = filter.testId;

  const isSuperAdmin = caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (!isSuperAdmin) {
    if (isManager && userDept) {
      query.$or = [{ department: userDept }, { userId: caller.userId }];
    } else {
      query.userId = caller.userId;
    }
  }

  const docs = await db
    .collection("test_results")
    .find(query)
    .sort({ completedAt: -1 })
    .toArray();

  let list: TestResultSummary[] = (docs as any[]).map((r) => ({
    id: r._id ? r._id.toString() : String(r.id),
    tenantId: r.tenantId,
    attemptId: r.attemptId,
    testId: r.testId,
    testTitle: r.testTitle,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    department: r.department,
    totalScore: r.totalScore,
    maxScore: r.maxScore,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    completedAt: r.completedAt,
  }));

  if (filter.search?.trim()) {
    const s = filter.search.toLowerCase().trim();
    list = list.filter(
      (r) =>
        r.userName.toLowerCase().includes(s) ||
        r.testTitle.toLowerCase().includes(s) ||
        r.department.toLowerCase().includes(s)
    );
  }

  return list;
}

export async function getResultById(
  tenantId: string = "default",
  id: string,
  caller: { userId: string; role: string; department?: string }
): Promise<TestResultSummary | null> {
  const db = await getDb();
  if (!db) return null;

  const r = await db.collection("test_results").findOne({
    tenantId,
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  if (!r) return null;

  const isSuperAdmin = caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (!isSuperAdmin) {
    if (isManager && r.department !== userDept && r.userId !== caller.userId) {
      throw new Error("Forbidden: You do not have permission to view this candidate result");
    } else if (!isManager && r.userId !== caller.userId) {
      throw new Error("Forbidden: You can only view your own assessment results");
    }
  }

  return {
    id: r._id ? r._id.toString() : String(r.id),
    tenantId: r.tenantId,
    attemptId: r.attemptId,
    testId: r.testId,
    testTitle: r.testTitle,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    department: r.department,
    totalScore: r.totalScore,
    maxScore: r.maxScore,
    percentage: r.percentage,
    passed: r.passed,
    grade: r.grade,
    completedAt: r.completedAt,
  };
}
