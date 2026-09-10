import { getDb } from "./mongo-helper";
import { ObjectId } from "mongodb";

export type TimesheetStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TimesheetEntry {
  _id?: string;
  tenantId?: string;
  taskId: string;
  taskTitle?: string;
  projectId: string;
  projectName?: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  billable: boolean;
  notes?: string;
  status: TimesheetStatus;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt?: string;
}

export async function getTimesheets(filter?: {
  userId?: string;
  projectId?: string;
  status?: TimesheetStatus;
  tenantId?: string;
}): Promise<TimesheetEntry[]> {
  const db = await getDb();
  if (!db) return [];

  const query: Record<string, unknown> = {};
  if (filter?.userId) query.userId = filter.userId;
  if (filter?.projectId) query.projectId = filter.projectId;
  if (filter?.status) query.status = filter.status;
  if (filter?.tenantId) query.tenantId = filter.tenantId;

  const docs = await db.collection("timesheets").find(query).sort({ date: -1, createdAt: -1 }).toArray();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
  })) as TimesheetEntry[];
}

export async function createTimesheet(data: Omit<TimesheetEntry, "_id" | "createdAt">): Promise<TimesheetEntry | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const doc = {
    ...data,
    status: data.status || "PENDING",
    createdAt: now,
  };

  const res = await db.collection("timesheets").insertOne(doc);

  // Also update loggedHours in task
  if (ObjectId.isValid(data.taskId)) {
    await db.collection("tasks").updateOne(
      { _id: new ObjectId(data.taskId) },
      { $inc: { loggedHours: data.hours } }
    );
  }

  return {
    ...doc,
    _id: res.insertedId.toString(),
    createdAt: now.toISOString(),
  } as TimesheetEntry;
}

export async function updateTimesheetStatus(
  id: string,
  status: TimesheetStatus,
  approvedBy?: string,
  rejectionReason?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return false;

  const update: Record<string, unknown> = { status };
  if (approvedBy) update.approvedBy = approvedBy;
  if (rejectionReason) update.rejectionReason = rejectionReason;

  const res = await db.collection("timesheets").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );
  return res.modifiedCount > 0;
}
