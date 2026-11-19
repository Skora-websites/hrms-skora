import "server-only";
import { getDb, ObjectId } from "@/lib/db/mysql";
import type { TestQuestion, QuestionType, AnswerMode, QuestionStatus } from "./types";

export interface CreateQuestionInput {
  type: QuestionType;
  text: string;
  topic?: string;
  options?: Array<{ id: string; text: string }>;
  answerMode?: AnswerMode;
  correctOptions?: string[];
  referenceAnswer?: string;
  maxMarks?: number;
  suggestedDurationMinutes?: number;
}

export async function createQuestion(
  tenantId: string = "default",
  input: CreateQuestionInput,
  createdBy?: string
): Promise<TestQuestion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nowIso = new Date().toISOString();
  const questionDoc = {
    tenantId,
    type: input.type,
    text: input.text.trim(),
    topic: input.topic?.trim() || "General",
    status: "ACTIVE" as QuestionStatus,
    options: input.options || [],
    answerMode: input.answerMode || "SINGLE",
    correctOptions: input.correctOptions || [],
    referenceAnswer: input.referenceAnswer || "",
    maxMarks: Number(input.maxMarks || (input.type === "MCQ" ? 2 : 10)),
    suggestedDurationMinutes: Number(input.suggestedDurationMinutes || 5),
    createdBy: createdBy || "system",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const res = await db.collection("test_questions").insertOne(questionDoc as any);
  return {
    id: res.insertedId.toString(),
    ...questionDoc,
  };
}

export async function getQuestions(
  tenantId: string = "default",
  filter: {
    topic?: string;
    type?: QuestionType | "all";
    status?: QuestionStatus | "all";
    search?: string;
  } = {}
): Promise<TestQuestion[]> {
  const db = await getDb();
  if (!db) return [];

  const query: any = { tenantId };
  if (filter.type && filter.type !== "all") query.type = filter.type;
  if (filter.topic && filter.topic !== "all") query.topic = filter.topic;
  if (filter.status && filter.status !== "all") query.status = filter.status;

  const docs = await db
    .collection("test_questions")
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  let results: TestQuestion[] = (docs as any[]).map((q) => ({
    id: q._id ? q._id.toString() : String(q.id),
    tenantId: q.tenantId,
    type: q.type,
    text: q.text,
    topic: q.topic,
    status: q.status || "ACTIVE",
    options: q.options || [],
    answerMode: q.answerMode || "SINGLE",
    correctOptions: q.correctOptions || [],
    referenceAnswer: q.referenceAnswer || "",
    maxMarks: q.maxMarks || 2,
    suggestedDurationMinutes: q.suggestedDurationMinutes || 5,
    createdBy: q.createdBy,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  }));

  if (filter.search?.trim()) {
    const s = filter.search.toLowerCase().trim();
    results = results.filter(
      (q) =>
        q.text.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s) ||
        (q.options && q.options.some((o) => o.text.toLowerCase().includes(s)))
    );
  }

  return results;
}

export async function getQuestionById(
  tenantId: string = "default",
  id: string
): Promise<TestQuestion | null> {
  const db = await getDb();
  if (!db) return null;

  const q = await db.collection("test_questions").findOne({
    tenantId,
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  if (!q) return null;
  return {
    id: q._id ? q._id.toString() : String(q.id),
    tenantId: q.tenantId,
    type: q.type,
    text: q.text,
    topic: q.topic,
    status: q.status || "ACTIVE",
    options: q.options || [],
    answerMode: q.answerMode || "SINGLE",
    correctOptions: q.correctOptions || [],
    referenceAnswer: q.referenceAnswer || "",
    maxMarks: q.maxMarks || 2,
    suggestedDurationMinutes: q.suggestedDurationMinutes || 5,
    createdBy: q.createdBy,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

export async function updateQuestion(
  tenantId: string = "default",
  id: string,
  patch: Partial<CreateQuestionInput & { status: QuestionStatus }>
): Promise<TestQuestion | null> {
  const db = await getDb();
  if (!db) return null;

  const updateDoc: any = {
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await db.collection("test_questions").updateOne(
    {
      tenantId,
      _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
    },
    { $set: updateDoc }
  );

  return getQuestionById(tenantId, id);
}

export async function deleteQuestion(
  tenantId: string = "default",
  id: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.collection("test_questions").deleteOne({
    tenantId,
    _id: ObjectId.isValid(id) ? new ObjectId(id) : id,
  });

  return true;
}
