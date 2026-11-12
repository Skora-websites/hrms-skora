import "server-only";
import { getMongoClient, getDb, clientPromise, ObjectId } from "./db/mysql";

export { clientPromise, getMongoClient, getDb, ObjectId };
export default clientPromise;
