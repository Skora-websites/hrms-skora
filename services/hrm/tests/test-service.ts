import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type {
  TestDefinition,
  TestStatus,
  TestProctoringSettings,
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
  assignedUserIds?: string[];
  assignedDepartment?: string;
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
    assignedUserIds: input.assignedUserIds || [],
    assignedDepartment: input.assignedDepartment || input.department || "",
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

  const isSuperAdmin = caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
  const isManager = caller.role === "manager";
  const userDept = caller.department || "";

  if (!isSuperAdmin) {
    if (isManager) {
      // Managers see tests for their department or tests they created
      query.$or = [{ department: userDept }, { createdBy: caller.userId }];
    } else {
      // Employees see active tests assigned to their department or assigned to them explicitly
      query.status = "active";
      query.$or = [
        { assignedDepartment: userDept },
        { assignedDepartment: "All" },
        { department: userDept },
        { assignedUserIds: caller.userId },
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
    assignedUserIds: t.assignedUserIds || [],
    assignedDepartment: t.assignedDepartment || "",
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

  const isSuperAdmin = caller.role === "super_admin" || caller.role === "hr_admin" || caller.role === "admin";
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
    assignedUserIds: t.assignedUserIds || [],
    assignedDepartment: t.assignedDepartment || "",
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
  patch: Partial<CreateTestInput & { status: TestStatus }>,
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
