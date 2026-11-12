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
