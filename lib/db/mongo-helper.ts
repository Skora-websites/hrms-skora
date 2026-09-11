import { getMongoClient } from "@/lib/mongodb";
import { Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "hrms";

export async function getDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAME);
}
