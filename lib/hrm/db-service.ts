import "server-only";
import { getDb } from "@/lib/db/mysql";
import { ObjectId } from "@/lib/db/mysql";

export type Filter<T = any> = any;
export type Sort = any;

// Query clause types
export type FirestoreWhereOp = "<" | "<=" | "==" | ">=" | ">" | "!=" | "array-contains" | "array-contains-any" | "in" | "not-in";
export type FirestoreOrderDirection = "asc" | "desc";
export interface WhereClause { field: string; op: FirestoreWhereOp; value: unknown; }
export interface QueryOptions { where?: WhereClause[]; orderByField?: string; orderByDirection?: FirestoreOrderDirection; limitCount?: number; startAfter?: unknown; }

function opToSqlFilter(op: FirestoreWhereOp, value: unknown): Record<string, unknown> {
  const map: Record<string, string> = { "==": "$eq", "!=": "$ne", "<": "$lt", "<=": "$lte", ">": "$gt", ">=": "$gte", "in": "$in", "not-in": "$nin", "array-contains": "$in", "array-contains-any": "$in" };
  const mongoOp = map[op] || "$eq";
  const val = (op === "in" || op === "not-in" || op === "array-contains" || op === "array-contains-any") ? (Array.isArray(value) ? value : [value]) : value;
  return { [mongoOp]: val };
}

function buildFilter(clauses: WhereClause[] | undefined): Filter<any> {
  if (!clauses || clauses.length === 0) return {};
  const parts: Filter<any>[] = clauses.map(c => {
    const m = opToSqlFilter(c.op, c.value);
    const op = Object.keys(m)[0];
    return { [c.field]: { [op]: m[op] } };
  });
  return parts.length === 1 ? parts[0] : { "$and": parts };
}

function buildSort(field?: string, dir?: FirestoreOrderDirection): Sort {
  if (!field) return { createdAt: -1 };
  return { [field]: dir === "desc" ? -1 : 1 };
}

function serializeId(doc: any): any {
  if (!doc) return doc;
  const out = { ...doc };
  if (out._id) { out.id = out._id.toString(); delete out._id; }
  return out;
}

/**
 * Creates a typed MySQL service for a given table/collection.
 * Backed 100% by MySQL (InnoDB).
 */
export function createMySQLService<T extends { id?: string; tenantId?: string }>(tableName: string) {
  async function table() {
    const db = await getDb();
    if (!db) throw new Error("MySQL database not connected");
    return db.collection(tableName);
  }

  function tenantWhere(tenantId: string, options: QueryOptions = {}): WhereClause[] {
    return [
      ...(options.where || []),
      { field: "tenantId", op: "==", value: tenantId },
    ];
  }

  return {
    async findById(id: string): Promise<T | null> {
      const c = await table();
      try {
        const doc = await c.findOne({ _id: new ObjectId(id) });
        return doc ? serializeId(doc) as T : null;
      } catch {
        const doc = await c.findOne({ id });
        return doc ? serializeId(doc) as T : null;
      }
    },

    async findByIdInTenant(tenantId: string, id: string): Promise<T | null> {
      const c = await table();
      try {
        const doc = await c.findOne({
          $and: [{ _id: new ObjectId(id) }, { tenantId }],
        });
        return doc ? serializeId(doc) as T : null;
      } catch {
        const doc = await c.findOne({
          $and: [{ id }, { tenantId }],
        });
        return doc ? serializeId(doc) as T : null;
      }
    },

    async findManyInTenant(tenantId: string, options: QueryOptions = {}): Promise<T[]> {
      return this.findMany({ ...options, where: tenantWhere(tenantId, options) });
    },

    async findOneInTenant(tenantId: string, field: string, value: unknown): Promise<T | null> {
      const c = await table();
      const doc = await c.findOne({
        $and: [
          { [field]: value },
          { tenantId },
        ],
      });
      return doc ? serializeId(doc) as T : null;
    },

    async findOne(field: string, value: unknown): Promise<T | null> {
      const c = await table();
      const doc = await c.findOne({ [field]: value });
      return doc ? serializeId(doc) as T : null;
    },

    async findMany(options: QueryOptions = {}): Promise<T[]> {
      const c = await table();
      let q = c.find(buildFilter(options.where));
      q = q.sort(buildSort(options.orderByField, options.orderByDirection));
      if (options.limitCount) q = q.limit(options.limitCount);
      const docs = await q.toArray();
      return docs.map(d => serializeId(d)) as T[];
    },

    async create(data: Partial<T>): Promise<T> {
      const c = await table();
      const now = new Date();
      const doc = { ...data, createdAt: now, updatedAt: now };
      const result = await c.insertOne(doc);
      return { ...doc, id: result.insertedId.toString() } as unknown as T;
    },

    async createInTenant(tenantId: string, data: Partial<T>): Promise<T> {
      return this.create({ ...data, tenantId });
    },

    /** Bulk insert — one round-trip for N rows. Returns the number inserted. */
    async createMany(docs: Array<Partial<T>>): Promise<number> {
      if (!docs || docs.length === 0) return 0;
      const c = await table();
      const now = new Date();
      const payload = docs.map((d) => ({ ...d, createdAt: now, updatedAt: now }));
      const result = await c.insertMany(payload);
      return result.insertedCount ?? payload.length;
    },

    async createWithId(id: string, data: Partial<T>): Promise<T> {
      const c = await table();
      const now = new Date();
      const doc = { ...data, id, createdAt: now, updatedAt: now };
      await c.insertOne(doc);
      return doc as unknown as T;
    },

    async update(id: string, data: Partial<T>): Promise<T | null> {
      const c = await table();
      const updateData = { ...data, updatedAt: new Date() };
      delete (updateData as any).id;
      delete (updateData as any)._id;
      try {
        const r = await c.findOneAndUpdate({ _id: new ObjectId(id) }, { "$set": updateData }, { returnDocument: "after" });
        return r ? serializeId(r) as T : null;
      } catch {
        const r = await c.findOneAndUpdate({ id }, { "$set": updateData }, { returnDocument: "after" });
        return r ? serializeId(r) as T : null;
      }
    },

    async delete(id: string): Promise<boolean> {
      const c = await table();
      try {
        const r = await c.deleteOne({ _id: new ObjectId(id) });
        return r.deletedCount > 0;
      } catch {
        const r = await c.deleteOne({ id });
        return r.deletedCount > 0;
      }
    },

    async updateWhere(clauses: WhereClause[], data: Partial<T>): Promise<number> {
      const c = await table();
      const updateData = { ...data, updatedAt: new Date() } as Record<string, unknown>;
      delete updateData.id;
      delete updateData._id;
      const r = await c.updateMany(buildFilter(clauses), { "$set": updateData });
      return r.modifiedCount ?? 0;
    },

    async countInTenant(tenantId: string, options: { where?: WhereClause[] } = {}): Promise<number> {
      const c = await table();
      return c.countDocuments(buildFilter(tenantWhere(tenantId, options)));
    },

    async count(options: { where?: WhereClause[] } = {}): Promise<number> {
      const c = await table();
      return c.countDocuments(buildFilter(options.where));
    },

    async runTransaction<R>(fn: (conn: any) => Promise<R>): Promise<R> {
      const { withTransaction } = await import("@/lib/db/mysql");
      return withTransaction(async (conn) => {
        return fn(conn);
      });
    },

    async findForUpdate(id: string, conn?: any): Promise<T | null> {
      const c = await table();
      try {
        const doc = await (c as any).findOneForUpdate({ _id: new ObjectId(id) }, conn);
        return doc ? serializeId(doc) as T : null;
      } catch {
        const doc = await (c as any).findOneForUpdate({ id }, conn);
        return doc ? serializeId(doc) as T : null;
      }
    },

    async getColl() { return table(); },
    doc(id: string) { return { id }; },
    batch() { return null; },
  };
}
