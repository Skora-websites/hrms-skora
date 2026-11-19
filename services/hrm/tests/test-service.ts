import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type {
  TestDefinition,
  TestStatus,
  TestTargetType,
  TestProctoringSettings,
  CandidateProgressItem,
} from "./types";
import { getQuestions } from "./question-service";

export interface CreateTestInput {
  title: string;
  description?: string;
  department?: string;
  category?: string;
  durationMinutes: number;
  passPercentage?: number;
  questionIds: string[];
  targetType?: TestTargetType;
  targetUserIds?: string[];
  assignedUserIds?: string[];
  assignedDepartment?: string;
  startDate?: string | null;
  dueDate?: string | null;
  maxAttempts?: number;
  plannedDate?: string;
  proctoring?: Partial<TestProctoringSettings>;
}

export async function createTest(
  tenantId: string = "default",
  input: CreateTestInput,
  caller: { userId: string; userName: string; role: string; department?: string }
): Promise<TestDefinition> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate total marks by summing linked question marks
  const allQuestions = await getQuestions(tenantId);
  const qMap = new Map(allQuestions.map((q) => [q.id, q.maxMarks]));
  const totalMarks = input.questionIds.reduce((sum, qId) => sum + (qMap.get(qId) || 2), 0);

  const defaultProctoring: TestProctoringSettings = {
    requireFullscreen: input.proctoring?.requireFullscreen ?? false,
    maxViolationsAllowed: input.proctoring?.maxViolationsAllowed ?? 3,
    lockOnViolationExceeded: input.proctoring?.lockOnViolationExceeded ?? true,
    autoSubmitOnTimerExpiry: input.proctoring?.autoSubmitOnTimerExpiry ?? true,
  };

  const targetType: TestTargetType =
    input.targetType || (input.targetUserIds?.length ? "SPECIFIC_USERS" : "DEPARTMENT");
  const targetUserIds = input.targetUserIds || input.assignedUserIds || [];

  const nowIso = new Date().toISOString();
  const testDoc = {
    tenantId,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    department: input.department || caller.department || "General",
    category: input.category || "General",
    durationMinutes: Number(input.durationMinutes || 30),
    totalMarks,
    passPercentage: Number(input.passPercentage || 60),
    status: "active" as TestStatus,
    questionIds: input.questionIds || [],
    targetType,
    targetUserIds,
    assignedUserIds: targetUserIds,
    assignedDepartment: input.assignedDepartment || input.department || "",
    startDate: input.startDate || null,
    dueDate: input.dueDate || null,
    maxAttempts: Math.max(1, Number(input.maxAttempts || 1)),
    grantedRetakes: {} as Record<string, number>,
    plannedDate: input.plannedDate || null,
    proctoring: defaultProctoring,
    createdBy: caller.userId,
    createdByName: caller.userName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await db.collection("test_definitions").insertOne(testDoc as any);
  return {
    id: res.insertedId.toString(),
    ...testDoc,
  };
}

export async function getTests(
  tenantId: string = "default",
  caller: { userId: string; role: string; department?: string },
  filter: { status?: TestStatus | "all"; search?: string } = {}
): Promise<TestDefinition[]> {
  const db = await getDb();
  if (!db) return [];

  const query: any = { tenantId };
  if (filter.status && filter.status !== "all") {
    query.status = filter.status;
  }

  const isSuperAdmin =
    caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (!isSuperAdmin) {
    if (isManager) {
      // Managers see tests for their department or tests they created
      query.$or = [{ department: userDept }, { createdBy: caller.userId }];
    } else {
      // Employees see active tests targeted to their department or assigned to them explicitly
      query.status = "active";
      query.$or = [
        { targetType: "SPECIFIC_USERS", targetUserIds: caller.userId },
        { targetType: "SPECIFIC_USERS", assignedUserIds: caller.userId },
        { targetType: "DEPARTMENT", department: userDept },
        { targetType: "DEPARTMENT", department: "General" },
        { targetType: "DEPARTMENT", department: "All" },
        { targetType: "DEPARTMENT", department: "All Departments" },
        { targetType: { $exists: false }, department: userDept },
        { targetType: { $exists: false }, department: "General" },
        { targetType: { $exists: false }, department: "All" },
        { targetType: { $exists: false }, department: "All Departments" },
        { targetType: { $exists: false }, assignedUserIds: caller.userId },
      ];
    }
  }

  const docs = await db
    .collection("test_definitions")
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  let results: TestDefinition[] = (docs as any[]).map((t) => ({
    id: t._id ? t._id.toString() : String(t.id),
    tenantId: t.tenantId,
    title: t.title,
    description: t.description || "",
    department: t.department,
    category: t.category,
    durationMinutes: t.durationMinutes || 30,
    totalMarks: t.totalMarks || 0,
    passPercentage: t.passPercentage || 60,
    status: t.status || "active",
    questionIds: t.questionIds || [],
    targetType: t.targetType || "DEPARTMENT",
    targetUserIds: t.targetUserIds || t.assignedUserIds || [],
    assignedUserIds: t.assignedUserIds || t.targetUserIds || [],
    assignedDepartment: t.assignedDepartment || "",
    startDate: t.startDate || null,
    dueDate: t.dueDate || null,
    maxAttempts: t.maxAttempts || 1,
    grantedRetakes: t.grantedRetakes || {},
    plannedDate: t.plannedDate,
    proctoring: t.proctoring || {
      requireFullscreen: false,
      maxViolationsAllowed: 3,
      lockOnViolationExceeded: true,
      autoSubmitOnTimerExpiry: true,
    },
    createdBy: t.createdBy,
    createdByName: t.createdByName,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  if (filter.search?.trim()) {
    const s = filter.search.toLowerCase().trim();
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.department?.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function getTestById(
  tenantId: string = "default",
  id: string,
  caller: { userId: string; role: string; department?: string }
): Promise<TestDefinition | null> {
  const db = await getDb();
  if (!db) return null;

  const t = await db.collection("test_definitions").findOne({
    tenantId,
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  if (!t) return null;

  const isSuperAdmin =
    caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  // Authorization check
  if (!isSuperAdmin) {
    if (isManager && t.department !== userDept && t.createdBy !== caller.userId) {
      throw new Error("Forbidden: You do not have permission to access tests from other departments");
    }
  }

  return {
    id: t._id ? t._id.toString() : String(t.id),
    tenantId: t.tenantId,
    title: t.title,
    description: t.description || "",
    department: t.department,
    category: t.category,
    durationMinutes: t.durationMinutes || 30,
    totalMarks: t.totalMarks || 0,
    passPercentage: t.passPercentage || 60,
    status: t.status || "active",
    questionIds: t.questionIds || [],
    targetType: t.targetType || "DEPARTMENT",
    targetUserIds: t.targetUserIds || t.assignedUserIds || [],
    assignedUserIds: t.assignedUserIds || t.targetUserIds || [],
    assignedDepartment: t.assignedDepartment || "",
    startDate: t.startDate || null,
    dueDate: t.dueDate || null,
    maxAttempts: t.maxAttempts || 1,
    grantedRetakes: t.grantedRetakes || {},
    plannedDate: t.plannedDate,
    proctoring: t.proctoring || {
      requireFullscreen: false,
      maxViolationsAllowed: 3,
      lockOnViolationExceeded: true,
      autoSubmitOnTimerExpiry: true,
    },
    createdBy: t.createdBy,
    createdByName: t.createdByName,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function updateTest(
  tenantId: string = "default",
  id: string,
  patch: Partial<CreateTestInput & { status: TestStatus; grantedRetakes?: Record<string, number> }>,
  caller: { userId: string; role: string; department?: string }
): Promise<TestDefinition | null> {
  const existing = await getTestById(tenantId, id, caller);
  if (!existing) throw new Error("Test not found");

  const db = await getDb();
  if (!db) return null;

  const updateDoc: any = {
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await db.collection("test_definitions").updateOne(
    {
      tenantId,
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    },
    { $set: updateDoc }
  );

  return getTestById(tenantId, id, caller);
}

export async function deleteTest(
  tenantId: string = "default",
  id: string,
  caller: { userId: string; role: string; department?: string }
): Promise<boolean> {
  const existing = await getTestById(tenantId, id, caller);
  if (!existing) throw new Error("Test not found");

  const db = await getDb();
  if (!db) return false;

  await db.collection("test_definitions").deleteOne({
    tenantId,
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  return true;
}

/**
 * Grants an additional retake (+1 attempt) to a specific candidate for an assessment.
 */
export async function grantRetake(
  tenantId: string = "default",
  testId: string,
  targetUserId: string,
  caller: { userId: string; role: string; department?: string }
): Promise<{ success: boolean; extraAttemptsGranted: number }> {
  const test = await getTestById(tenantId, testId, caller);
  if (!test) throw new Error("Assessment not found");

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const grantedRetakes = { ...(test.grantedRetakes || {}) };
  const currentGranted = grantedRetakes[targetUserId] || 0;
  const newCount = currentGranted + 1;
  grantedRetakes[targetUserId] = newCount;

  await db.collection("test_definitions").updateOne(
    {
      tenantId,
      _id: ObjectId.isValid(testId) ? new ObjectId(testId) : testId,
    },
    {
      $set: {
        grantedRetakes,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  return { success: true, extraAttemptsGranted: newCount };
}

/**
 * Returns candidate progress, attempt counts, and scores for all targeted employees of an assessment.
 */
export async function getTestCandidateProgress(
  tenantId: string = "default",
  testId: string,
  caller: { userId: string; role: string; department?: string }
): Promise<CandidateProgressItem[]> {
  const test = await getTestById(tenantId, testId, caller);
  if (!test) throw new Error("Assessment not found");

  const db = await getDb();
  if (!db) return [];

  // 1. Fetch targeted candidates from users collection
  let usersQuery: any = { status: { $ne: "archived" } };
  if (test.targetType === "SPECIFIC_USERS" && test.targetUserIds?.length) {
    const ids = test.targetUserIds.map((id) =>
      ObjectId.isValid(id) ? new ObjectId(id) : id
    );
    usersQuery.$or = [{ _id: { $in: ids } }, { id: { $in: test.targetUserIds } }];
  } else if (
    test.department &&
    test.department !== "General" &&
    test.department !== "All" &&
    test.department !== "All Departments"
  ) {
    usersQuery.department = test.department;
    usersQuery.role = "employee";
  } else {
    usersQuery.role = "employee";
  }

  const rawUsers = await db.collection("users").find(usersQuery).toArray();

  // 2. Fetch attempts for this test
  const attempts = await db
    .collection("test_attempts")
    .find({ tenantId, testId })
    .sort({ createdAt: -1 })
    .toArray();

  // 3. Fetch finalized results
  const results = await db.collection("test_results").find({ tenantId, testId }).toArray();
  const resultsMap = new Map(results.map((r: any) => [r.userId, r]));

  // Group attempts by userId
  const attemptsByUser = new Map<string, any[]>();
  for (const att of attempts as any[]) {
    const list = attemptsByUser.get(att.userId) || [];
    list.push(att);
    attemptsByUser.set(att.userId, list);
  }

  const isOverdue = test.dueDate ? new Date(test.dueDate).getTime() < Date.now() : false;
  const baseMax = test.maxAttempts || 1;

  const items: CandidateProgressItem[] = (rawUsers as any[]).map((u) => {
    const uId = u._id ? u._id.toString() : String(u.id);
    const userAttempts = attemptsByUser.get(uId) || [];
    const completedAttempts = userAttempts.filter((a) =>
      ["submitted", "evaluated", "timed_out"].includes(a.status)
    );
    const activeAttempt = userAttempts.find((a) => a.status === "in_progress");

    const extraGranted = (test.grantedRetakes && test.grantedRetakes[uId]) || 0;
    const maxAttemptsAllowed = baseMax + extraGranted;

    const res = resultsMap.get(uId);

    let status: CandidateProgressItem["status"] = "not_started";
    if (res) {
      status = "evaluated";
    } else if (userAttempts.some((a) => a.status === "submitted")) {
      status = "submitted";
    } else if (activeAttempt) {
      status = "in_progress";
    } else if (isOverdue) {
      status = "overdue";
    }

    const latestAttempt = userAttempts[0];

    return {
      userId: uId,
      name: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Employee",
      email: u.email || "",
      department: u.department || u.departmentName || "General",
      status,
      attemptsUsed: completedAttempts.length,
      maxAttemptsAllowed,
      bestScore: res ? res.totalScore : latestAttempt?.totalScore,
      maxScore: res ? res.maxScore : test.totalMarks,
      percentage: res ? res.percentage : latestAttempt?.percentage,
      passed: res ? res.passed : latestAttempt?.passed,
      latestAttemptId: latestAttempt ? latestAttempt._id?.toString() || String(latestAttempt.id) : undefined,
      lastAttemptAt: latestAttempt ? latestAttempt.submittedAt || latestAttempt.createdAt : undefined,
    };
  });

  return items;
}
