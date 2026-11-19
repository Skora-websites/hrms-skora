// lib/mongodb.ts — Legacy compatibility shim.
// All database operations are backed 100% by MySQL via lib/db/mysql.
import "server-only";
import { getMongoClient, getDb, clientPromise, ObjectId } from "./db/mysql";

export { clientPromise, getMongoClient, getDb, ObjectId };
export default clientPromise;
