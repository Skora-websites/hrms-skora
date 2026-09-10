import { getDb } from "./mongo-helper";
import { ObjectId } from "mongodb";

export interface Project {
  _id?: string;
  tenantId?: string;
  name: string;
  description?: string;
  clientName?: string;
  budget?: number;
  managerId: string;
  managerName?: string;
  status: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate?: string;
  members?: string[]; // Array of employee IDs
  createdAt?: string;
}

export async function getProjects(tenantId?: string, managerId?: string): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  const query: Record<string, unknown> = {};
  if (tenantId) query.tenantId = tenantId;
  if (managerId) query.managerId = managerId;

  const docs = await db.collection("projects").find(query).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
  })) as Project[];
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return null;

  const doc = await db.collection("projects").findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  } as Project;
}

export async function createProject(data: Omit<Project, "_id" | "createdAt">): Promise<Project | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const doc = {
    ...data,
    createdAt: now,
  };

  const res = await db.collection("projects").insertOne(doc);
  return {
    ...doc,
    _id: res.insertedId.toString(),
    createdAt: now.toISOString(),
  } as Project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return false;

  const res = await db.collection("projects").updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  return res.modifiedCount > 0;
}
