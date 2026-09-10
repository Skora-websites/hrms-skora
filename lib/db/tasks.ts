import { getDb } from "./mongo-helper";
import { ObjectId } from "mongodb";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Task {
  _id?: string;
  projectId: string;
  projectName?: string;
  tenantId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName?: string;
  dueDate?: string;
  estimatedHours?: number;
  loggedHours?: number;
  tags?: string[];
  createdAt?: string;
}

export async function getTasks(filter?: { projectId?: string; assigneeId?: string; tenantId?: string }): Promise<Task[]> {
  const db = await getDb();
  if (!db) return [];

  const query: Record<string, unknown> = {};
  if (filter?.projectId) query.projectId = filter.projectId;
  if (filter?.assigneeId) query.assigneeId = filter.assigneeId;
  if (filter?.tenantId) query.tenantId = filter.tenantId;

  const docs = await db.collection("tasks").find(query).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
  })) as Task[];
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return null;

  const doc = await db.collection("tasks").findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  } as Task;
}

export async function createTask(data: Omit<Task, "_id" | "createdAt">): Promise<Task | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const doc = {
    ...data,
    loggedHours: data.loggedHours || 0,
    createdAt: now,
  };

  const res = await db.collection("tasks").insertOne(doc);
  return {
    ...doc,
    _id: res.insertedId.toString(),
    createdAt: now.toISOString(),
  } as Task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<boolean> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return false;

  const res = await db.collection("tasks").updateOne(
    { _id: new ObjectId(id) },
    { $set: { status } }
  );
  return res.modifiedCount > 0;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return false;

  const res = await db.collection("tasks").updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  return res.modifiedCount > 0;
}
