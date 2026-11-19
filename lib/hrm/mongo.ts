// lib/hrm/mongo.ts — Deprecated alias. Backed 100% by MySQL.
// Storage, queries, and transactions run on MySQL via mysql2.
import "server-only";
import {
  createMySQLService,
  WhereClause,
  QueryOptions,
  FirestoreWhereOp,
  FirestoreOrderDirection,
  Filter,
  Sort,
} from "./db-service";

export type { WhereClause, QueryOptions, FirestoreWhereOp, FirestoreOrderDirection, Filter, Sort };
export const createMongoService = createMySQLService;
export default createMySQLService;
