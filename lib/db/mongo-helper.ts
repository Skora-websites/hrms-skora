// lib/db/mongo-helper.ts — Legacy helper shim.
// Backed 100% by MySQL via ./mysql.
import "server-only";
import { getDb as getMySQLDb, MySQLDatabase } from "./mysql";

export type { MySQLDatabase as Db };

export async function getDb(): Promise<MySQLDatabase | null> {
  try {
    return await getMySQLDb();
  } catch (error) {
    console.error("[MySQL] Failed to get database connection:", error);
    return null;
  }
}
