import "server-only";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * Generate the next employee code in the form EMP-<year>-<4-digit sequence>.
 * The counter lives in a dedicated doc so concurrent approvals increment it
 * atomically instead of racing on max(employeeCode).
 */
export async function generateEmployeeCode(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const counterKey = `EMP-${year}`;

  const res = await db.collection("counters").findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 }, $setOnInsert: { key: counterKey } },
    { upsert: true, returnDocument: "after" }
  );

  const seq = Number((res as any)?.seq || 1);
  return `EMP-${year}-${String(seq).padStart(4, "0")}`;
}
