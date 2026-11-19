import "server-only";
import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import crypto from "crypto";

// ── Configuration ────────────────────────────────────────────────────────────

const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "hrms";

const globalForMySQL = globalThis as unknown as { mysqlPool: Pool | null };
let globalPool: Pool | null = globalForMySQL.mysqlPool || null;

export function getMySQLPool(): Pool {
  if (!globalPool) {
    globalPool = mysql.createPool({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true,
    });
    globalForMySQL.mysqlPool = globalPool;
  }
  return globalPool;
}

// ── ObjectId Polyfill / Helper ───────────────────────────────────────────────

export class ObjectId {
  private hex: string;

  constructor(id?: string | number | ObjectId) {
    if (id instanceof ObjectId) {
      this.hex = id.hex;
    } else if (typeof id === "string") {
      this.hex = id;
    } else if (typeof id === "number") {
      this.hex = String(id);
    } else {
      this.hex = crypto.randomBytes(12).toString("hex");
    }
  }

  toString(): string {
    return this.hex;
  }

  toHexString(): string {
    return this.hex;
  }

  toJSON(): string {
    return this.hex;
  }

  valueOf(): string {
    return this.hex;
  }

  equals(other: unknown): boolean {
    if (!other) return false;
    const str = typeof other === "object" && "toString" in (other as any) ? (other as any).toString() : String(other);
    return this.hex === str;
  }

  static isValid(id: unknown): boolean {
    if (!id) return false;
    if (id instanceof ObjectId) return true;
    if (typeof id === "number") return true;
    if (typeof id !== "string") return false;
    return /^[0-9a-fA-F]{24}$/.test(id) || /^[0-9]+$/.test(id);
  }
}

// ── Collection to Table Mapping ──────────────────────────────────────────────

export const COLLECTION_TABLE_MAP: Record<string, string> = {
  users: "users",
  sessions: "sessions",
  attendance: "attendance",
  attendances: "attendance",
  early_departure_requests: "early_departure_requests",
  regularization_requests: "regularization_requests",
  tasks: "tasks",
  hrm_tasks: "tasks",
  projects: "projects",
  timesheets: "timesheets",
  leave_requests: "leave_requests",
  leaverequests: "leave_requests",
  leave_types: "leave_types",
  leave_balances: "leave_balances",
  leave_balance_history: "leave_balance_history",
  holidays: "holidays",
  notifications: "notifications",
  push_notifications: "push_notifications",
  push_subscriptions: "push_subscriptions",
  audit_logs: "audit_logs",
  auditlogs: "audit_logs",
  documents: "documents",
  userdocuments: "documents",
  document_categories: "document_categories",
  employee_onboarding_tasks: "employee_onboarding_tasks",
  employeeOnboardingTasks: "employee_onboarding_tasks",
  onboardingDocuments: "employee_onboarding_tasks",
  onboarding: "employee_onboarding_tasks",
  onboarding_programs: "onboarding_programs",
  offer_letters: "offer_letters",
  offerletters: "offer_letters",
  offerLetters: "offer_letters",
  exit_records: "exit_records",
  employee_exits: "exit_records",
  assets: "assets",
  asset_categories: "asset_categories",
  departments: "departments",
  designations: "designations",
  organizations: "organizations",
  tenants: "tenants",
  tickets: "tickets",
  ticket_replies: "ticket_replies",
  salary_components: "salary_components",
  payroll_runs: "payroll_runs",
  payroll_transactions: "payroll_transactions",
  payslips: "payslips",
  payrolls: "payslips",
  payroll: "payslips",
  pay_groups: "pay_groups",
  posts: "engage_posts",
  engage_posts: "engage_posts",
  comments: "engage_comments",
  engage_comments: "engage_comments",
  jobs: "jobs",
  candidates: "candidates",
  applications: "applications",
  performance_reviews: "performance_reviews",
  performance_goals: "performance_goals",
  goals: "performance_goals",
  performance_feedback: "performance_feedback",
  performance_kpis: "performance_kpis",
  files: "files",
  "profile-images": "files",
  settings: "settings",
  superadminsettings: "settings",
  hradminsettings: "settings",
  managersettings: "settings",
  employeesettings: "settings",
  password_resets: "password_resets",
  email_delivery_logs: "email_delivery_logs",
  email_delivery_log: "email_delivery_logs",
  counters: "counters",
  escalations: "escalations",
  shifts: "shifts",
  shift_assignments: "shift_assignments",
  weekly_offs: "weekly_offs",
  expenses: "expenses",
  expense_categories: "expense_categories",
  salary_advances: "salary_advances",
  salary_advance: "salary_advances",
  overtime_records: "overtime_records",
  overtime: "overtime_records",
  kudos: "kudos",
  kudos_likes: "kudos_likes",
  workflow_rules: "workflow_rules",
  workflow_execution_logs: "workflow_execution_logs",
  roles_permissions_matrix: "roles_permissions_matrix",
  shift_swap_requests: "shift_swap_requests",
  exit_settlements: "exit_settlements",
  document_letter_templates: "document_letter_templates",
  generated_employee_letters: "generated_employee_letters",
  statutory_config: "statutory_config",
  employee_tax_declarations: "employee_tax_declarations",
  payroll_disbursement_batches: "payroll_disbursement_batches",
  department_headcount_plans: "department_headcount_plans",
  internal_job_postings: "internal_job_postings",
  performance_360_reviews: "performance_360_reviews",
  custom_report_definitions: "custom_report_definitions",
  ticket_comments: "ticket_comments",
  ticket_transfers: "ticket_transfers",
  ticket_categories: "ticket_categories",
  ticket_routing_rules: "ticket_routing_rules",
  ticket_read_states: "ticket_read_states",
  cron_job_logs: "cron_job_logs",
};

// Cache table columns
const tableColumnsCache = new Map<string, Set<string>>();

async function getTableColumns(tableName: string): Promise<Set<string>> {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName)!;
  }
  const pool = getMySQLPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [MYSQL_DATABASE, tableName]
    );
    const cols = new Set<string>(rows.map((r) => String(r.COLUMN_NAME)));
    tableColumnsCache.set(tableName, cols);
    return cols;
  } catch {
    return new Set();
  }
}

const HIGH_FREQUENCY_SCHEMAS: Record<string, string> = {
  attendance: `
    \`userId\` varchar(64) DEFAULT NULL,
    \`date\` varchar(32) DEFAULT NULL,
    \`status\` varchar(32) DEFAULT NULL,
    KEY \`ix_attendance_user_date\` (\`tenantId\`, \`userId\`, \`date\`),
    KEY \`ix_attendance_date_status\` (\`tenantId\`, \`date\`, \`status\`),
  `,
  users: `
    \`email\` varchar(255) DEFAULT NULL,
    \`role\` varchar(64) DEFAULT NULL,
    KEY \`ix_users_tenant_email\` (\`tenantId\`, \`email\`),
  `,
  sessions: `
    \`token\` varchar(255) DEFAULT NULL,
    \`userId\` varchar(64) DEFAULT NULL,
    KEY \`ix_sessions_token\` (\`token\`),
  `,
  payroll_transactions: `
    \`payrollRunId\` varchar(64) DEFAULT NULL,
    \`userId\` varchar(64) DEFAULT NULL,
    \`periodMonth\` varchar(32) DEFAULT NULL,
    \`status\` varchar(32) DEFAULT NULL,
    KEY \`ix_paytx_tenant_month\` (\`tenantId\`, \`periodMonth\`),
  `,
  leave_requests: `
    \`userId\` varchar(64) DEFAULT NULL,
    \`status\` varchar(32) DEFAULT NULL,
    \`startDate\` varchar(32) DEFAULT NULL,
    \`endDate\` varchar(32) DEFAULT NULL,
    KEY \`ix_leave_user_status\` (\`tenantId\`, \`userId\`, \`status\`),
  `,
};

async function ensureTableExists(tableName: string): Promise<Set<string>> {
  const pool = getMySQLPool();
  const extraCols = HIGH_FREQUENCY_SCHEMAS[tableName] || "";
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
        \`legacyId\` char(24) DEFAULT NULL,
        \`tenantId\` varchar(64) NOT NULL DEFAULT 'default',
        ${extraCols}
        \`createdAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        \`deletedAt\` datetime(3) DEFAULT NULL,
        \`payload\` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_${tableName}_legacyId\` (\`legacyId\`),
        KEY \`ix_${tableName}_tenantId\` (\`tenantId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    tableColumnsCache.delete(tableName);
    return getTableColumns(tableName);
  } catch {
    return new Set();
  }
}

// ── Document <-> Row Serialization ───────────────────────────────────────────

function rowToDoc<T = any>(row: any): T | null {
  if (!row) return null;
  let payload: any = row.payload;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  } else if (!payload || typeof payload !== "object") {
    payload = {};
  }

  const id = row.legacyId || (row.id ? String(row.id) : undefined);
  const doc: any = {
    ...row,
    ...payload,
  };
  delete doc.payload;

  if (id) {
    doc.id = id;
    doc._id = id;
  }

  // Ensure dates are converted properly if needed
  if (row.createdAt && !doc.createdAt) doc.createdAt = new Date(row.createdAt);
  if (row.updatedAt && !doc.updatedAt) doc.updatedAt = new Date(row.updatedAt);

  return doc as T;
}

function cleanValueForSql(val: any): any {
  if (val === undefined) return null;
  if (val instanceof ObjectId) return val.toString();
  if (val instanceof Date) {
    return val.toISOString().slice(0, 23).replace("T", " ");
  }
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "object" && val !== null && !Buffer.isBuffer(val)) {
    return JSON.stringify(val);
  }
  return val;
}

// ── Query Builder ────────────────────────────────────────────────────────────

interface SqlCondition {
  sql: string;
  params: any[];
}

function parseFilter(tableName: string, columns: Set<string>, filter: Record<string, any>): SqlCondition {
  const parts: string[] = [];
  const params: any[] = [];

  if (!filter || Object.keys(filter).length === 0) {
    return { sql: "1=1", params: [] };
  }

  for (const [key, val] of Object.entries(filter)) {
    if (key === "$and" && Array.isArray(val)) {
      const subParts: string[] = [];
      for (const item of val) {
        const sub = parseFilter(tableName, columns, item);
        subParts.push(`(${sub.sql})`);
        params.push(...sub.params);
      }
      if (subParts.length > 0) parts.push(`(${subParts.join(" AND ")})`);
      continue;
    }

    if (key === "$or" && Array.isArray(val)) {
      const subParts: string[] = [];
      for (const item of val) {
        const sub = parseFilter(tableName, columns, item);
        subParts.push(`(${sub.sql})`);
        params.push(...sub.params);
      }
      if (subParts.length > 0) parts.push(`(${subParts.join(" OR ")})`);
      continue;
    }

    // ID Match: _id or id
    if (key === "_id" || key === "id") {
      const idVal = val instanceof ObjectId ? val.toString() : String(val);
      const isNumeric = /^[0-9]+$/.test(idVal);
      if (isNumeric) {
        parts.push("(legacyId = ? OR id = ?)");
        params.push(idVal, Number(idVal));
      } else {
        parts.push("(legacyId = ?)");
        params.push(idVal);
      }
      continue;
    }

    // Operators on field
    if (val !== null && typeof val === "object" && !(val instanceof Date) && !(val instanceof ObjectId) && !Array.isArray(val)) {
      const opKeys = Object.keys(val);
      for (const op of opKeys) {
        const opVal = val[op];
        const colExpr = columns.has(key) ? `\`${key}\`` : `JSON_VALUE(payload, '$.${key}')`;

        if (op === "$eq") {
          parts.push(`${colExpr} = ?`);
          params.push(cleanValueForSql(opVal));
        } else if (op === "$ne") {
          if (opVal === null) {
            parts.push(`${colExpr} IS NOT NULL`);
          } else {
            parts.push(`(${colExpr} != ? OR ${colExpr} IS NULL)`);
            params.push(cleanValueForSql(opVal));
          }
        } else if (op === "$gt") {
          parts.push(`${colExpr} > ?`);
          params.push(cleanValueForSql(opVal));
        } else if (op === "$gte") {
          parts.push(`${colExpr} >= ?`);
          params.push(cleanValueForSql(opVal));
        } else if (op === "$lt") {
          parts.push(`${colExpr} < ?`);
          params.push(cleanValueForSql(opVal));
        } else if (op === "$lte") {
          parts.push(`${colExpr} <= ?`);
          params.push(cleanValueForSql(opVal));
        } else if (op === "$in" && Array.isArray(opVal)) {
          if (opVal.length === 0) {
            parts.push("1=0");
          } else {
            const placeholders = opVal.map(() => "?").join(",");
            parts.push(`${colExpr} IN (${placeholders})`);
            params.push(...opVal.map(cleanValueForSql));
          }
        } else if (op === "$nin" && Array.isArray(opVal)) {
          if (opVal.length === 0) {
            parts.push("1=1");
          } else {
            const placeholders = opVal.map(() => "?").join(",");
            parts.push(`${colExpr} NOT IN (${placeholders})`);
            params.push(...opVal.map(cleanValueForSql));
          }
        } else if (op === "$regex") {
          parts.push(`${colExpr} REGEXP ?`);
          params.push(String(opVal));
        } else if (op === "$exists") {
          parts.push(opVal ? `${colExpr} IS NOT NULL` : `${colExpr} IS NULL`);
        }
      }
      continue;
    }

    // Direct equality match
    if (columns.has(key)) {
      if (val === null) {
        parts.push(`\`${key}\` IS NULL`);
      } else {
        parts.push(`\`${key}\` = ?`);
        params.push(cleanValueForSql(val));
      }
    } else {
      // In payload
      if (val === null) {
        parts.push(`JSON_VALUE(payload, '$.${key}') IS NULL`);
      } else {
        parts.push(`JSON_VALUE(payload, '$.${key}') = ?`);
        params.push(String(cleanValueForSql(val)));
      }
    }
  }

  return {
    sql: parts.length > 0 ? parts.join(" AND ") : "1=1",
    params,
  };
}

// ── Cursor Implementation ────────────────────────────────────────────────────

export class MySQLCursor<T = any> {
  private tableName: string;
  private filter: Record<string, any>;
  private sortObj: Record<string, 1 | -1> = {};
  private limitVal?: number;
  private skipVal?: number;

  constructor(tableName: string, filter: Record<string, any> = {}) {
    this.tableName = tableName;
    this.filter = filter;
  }

  sort(sort: Record<string, 1 | -1>): this {
    this.sortObj = { ...this.sortObj, ...sort };
    return this;
  }

  limit(limit: number): this {
    this.limitVal = limit;
    return this;
  }

  skip(skip: number): this {
    this.skipVal = skip;
    return this;
  }

  project<TResult = T>(_projection: any): MySQLCursor<TResult> {
    return this as unknown as MySQLCursor<TResult>;
  }

  async toArray(): Promise<T[]> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, this.filter);

    let query = `SELECT * FROM \`${this.tableName}\` WHERE ${whereSql}`;

    // Sort
    const sortKeys = Object.keys(this.sortObj);
    if (sortKeys.length > 0) {
      const orderClauses = sortKeys.map((k) => {
        const dir = this.sortObj[k] === -1 ? "DESC" : "ASC";
        if (columns.has(k)) {
          return `\`${k}\` ${dir}`;
        }
        return `JSON_VALUE(payload, '$.${k}') ${dir}`;
      });
      query += ` ORDER BY ${orderClauses.join(", ")}`;
    } else if (columns.has("createdAt")) {
      query += " ORDER BY createdAt DESC";
    }

    // Limit & Skip
    if (this.limitVal !== undefined) {
      query += ` LIMIT ${Number(this.limitVal)}`;
      if (this.skipVal !== undefined) {
        query += ` OFFSET ${Number(this.skipVal)}`;
      }
    } else if (this.skipVal !== undefined) {
      query += ` LIMIT 18446744073709551615 OFFSET ${Number(this.skipVal)}`;
    }

    try {
      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      return rows.map((r) => rowToDoc<T>(r)!).filter(Boolean);
    } catch (err: any) {
      if (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146) return [];
      throw err;
    }
  }
}

// ── Collection Class ─────────────────────────────────────────────────────────

export class MySQLCollection<T = any> {
  public readonly name: string;
  public readonly tableName: string;

  constructor(collectionName: string) {
    this.name = collectionName;
    this.tableName = COLLECTION_TABLE_MAP[collectionName] || collectionName;
  }

  async findOne<TResult = T>(filter: Record<string, any> = {}, _options: any = {}): Promise<TResult | null> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
    const query = `SELECT * FROM \`${this.tableName}\` WHERE ${whereSql} LIMIT 1`;
    try {
      const [rows] = await pool.query<RowDataPacket[]>(query, params);
      if (!rows || rows.length === 0) return null;
      return rowToDoc<TResult>(rows[0]);
    } catch (err: any) {
      if (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146) return null;
      throw err;
    }
  }

  find<TResult = T>(filter: Record<string, any> = {}, _options: any = {}): MySQLCursor<TResult> {
    return new MySQLCursor<TResult>(this.tableName, filter);
  }

  async findOneForUpdate<TResult = T>(
    filter: Record<string, any> = {},
    conn?: mysql.PoolConnection
  ): Promise<TResult | null> {
    const pool = getMySQLPool();
    const connection = conn || (await pool.getConnection());
    const shouldRelease = !conn;
    try {
      const columns = await getTableColumns(this.tableName);
      const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
      const query = `SELECT * FROM \`${this.tableName}\` WHERE ${whereSql} LIMIT 1 FOR UPDATE`;
      const [rows] = await connection.query<RowDataPacket[]>(query, params);
      if (!rows || rows.length === 0) return null;
      return rowToDoc<TResult>(rows[0]);
    } finally {
      if (shouldRelease) connection.release();
    }
  }

  async insertOne(doc: any): Promise<{ acknowledged: boolean; insertedId: string }> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);

    const legacyId = doc._id instanceof ObjectId ? doc._id.toString() : (doc._id || doc.id || new ObjectId().toString());
    const tenantId = doc.tenantId || "default";
    const now = new Date();

    const insertDoc = { ...doc };
    insertDoc._id = legacyId;
    insertDoc.id = legacyId;
    if (!insertDoc.createdAt) insertDoc.createdAt = now;
    if (!insertDoc.updatedAt) insertDoc.updatedAt = now;

    // Collect column values
    const colNames: string[] = ["legacyId", "tenantId", "payload"];
    const colValues: any[] = [legacyId, tenantId, JSON.stringify(insertDoc)];

    for (const col of columns) {
      if (col === "id" || col === "legacyId" || col === "tenantId" || col === "payload") continue;
      if (col in insertDoc) {
        colNames.push(`\`${col}\``);
        colValues.push(cleanValueForSql(insertDoc[col]));
      } else if (col === "createdAt") {
        colNames.push("`createdAt`");
        colValues.push(cleanValueForSql(now));
      } else if (col === "updatedAt") {
        colNames.push("`updatedAt`");
        colValues.push(cleanValueForSql(now));
      }
    }

    const placeholders = colNames.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${this.tableName}\` (${colNames.join(", ")}) VALUES (${placeholders})`;

    try {
      await pool.query<ResultSetHeader>(sql, colValues);
    } catch (err: any) {
      if (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146) {
        await ensureTableExists(this.tableName);
        await pool.query<ResultSetHeader>(sql, colValues);
      } else {
        throw err;
      }
    }
    return { acknowledged: true, insertedId: legacyId };
  }

  async insertMany(docs: any[]): Promise<{ acknowledged: boolean; insertedCount: number; insertedIds: Record<number, string> }> {
    const insertedIds: Record<number, string> = {};
    for (let i = 0; i < docs.length; i++) {
      const res = await this.insertOne(docs[i]);
      insertedIds[i] = res.insertedId;
    }
    return { acknowledged: true, insertedCount: docs.length, insertedIds };
  }

  async updateOne(filter: Record<string, any>, update: Record<string, any>, _options: any = {}): Promise<{ acknowledged: boolean; modifiedCount: number; matchedCount: number }> {
    const existing = await this.findOne(filter);
    if (!existing) {
      return { acknowledged: true, modifiedCount: 0, matchedCount: 0 };
    }

    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);

    // Apply mongo update operators ($set, $inc, $unset, $push, $pull)
    const updatedDoc: any = { ...existing };
    if (update.$set) {
      Object.assign(updatedDoc, update.$set);
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updatedDoc[k] = (Number(updatedDoc[k]) || 0) + Number(v);
      }
    }
    if (update.$unset) {
      for (const k of Object.keys(update.$unset)) {
        delete updatedDoc[k];
      }
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        if (!Array.isArray(updatedDoc[k])) {
          updatedDoc[k] = [];
        }
        updatedDoc[k].push(v);
      }
    }
    if (update.$pull) {
      for (const [k, v] of Object.entries(update.$pull)) {
        if (Array.isArray(updatedDoc[k])) {
          updatedDoc[k] = updatedDoc[k].filter((item: any) => {
            if (typeof v === "object" && v !== null) {
              return !Object.entries(v).every(([pk, pv]) => item?.[pk] === pv);
            }
            return item !== v;
          });
        }
      }
    }
    if (!update.$set && !update.$inc && !update.$unset && !update.$push && !update.$pull) {
      Object.assign(updatedDoc, update);
    }

    updatedDoc.updatedAt = new Date();

    const setClauses: string[] = ["payload = ?"];
    const params: any[] = [JSON.stringify(updatedDoc)];

    for (const col of columns) {
      if (col === "id" || col === "legacyId" || col === "payload") continue;
      if (col in updatedDoc) {
        setClauses.push(`\`${col}\` = ?`);
        params.push(cleanValueForSql(updatedDoc[col]));
      } else if (col === "updatedAt") {
        setClauses.push("`updatedAt` = ?");
        params.push(cleanValueForSql(updatedDoc.updatedAt));
      }
    }

    const { sql: whereSql, params: whereParams } = parseFilter(this.tableName, columns, filter);
    const updateSql = `UPDATE \`${this.tableName}\` SET ${setClauses.join(", ")} WHERE ${whereSql} LIMIT 1`;
    const [res] = await pool.query<ResultSetHeader>(updateSql, [...params, ...whereParams]);

    return {
      acknowledged: true,
      modifiedCount: res.affectedRows,
      matchedCount: 1,
    };
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>): Promise<{ acknowledged: boolean; modifiedCount: number }> {
    const docs = await this.find(filter).toArray();
    let modified = 0;
    for (const doc of docs) {
      const res = await this.updateOne({ _id: (doc as any)._id }, update);
      modified += res.modifiedCount;
    }
    return { acknowledged: true, modifiedCount: modified };
  }

  async deleteOne(filter: Record<string, any>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
    const deleteSql = `DELETE FROM \`${this.tableName}\` WHERE ${whereSql} LIMIT 1`;
    const [res] = await pool.query<ResultSetHeader>(deleteSql, params);
    return { acknowledged: true, deletedCount: res.affectedRows };
  }

  async deleteMany(filter: Record<string, any>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
    const deleteSql = `DELETE FROM \`${this.tableName}\` WHERE ${whereSql}`;
    const [res] = await pool.query<ResultSetHeader>(deleteSql, params);
    return { acknowledged: true, deletedCount: res.affectedRows };
  }

  async countDocuments(filter: Record<string, any> = {}): Promise<number> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
    const countSql = `SELECT COUNT(*) as cnt FROM \`${this.tableName}\` WHERE ${whereSql}`;
    try {
      const [rows] = await pool.query<RowDataPacket[]>(countSql, params);
      return Number(rows[0]?.cnt || 0);
    } catch (err: any) {
      if (err.code === "ER_NO_SUCH_TABLE" || err.errno === 1146) return 0;
      throw err;
    }
  }

  async findOneAndUpdate(filter: Record<string, any>, update: Record<string, any>, options: { returnDocument?: "after" | "before"; upsert?: boolean } = {}): Promise<T | null> {
    const before = await this.findOne(filter);
    if (!before) {
      if (options.upsert) {
        const newDoc = {
          ...filter,
          ...(update.$setOnInsert || {}),
          ...(update.$set || {}),
        };
        const ins = await this.insertOne(newDoc);
        return this.findOne({ _id: ins.insertedId });
      }
      return null;
    }

    await this.updateOne(filter, update);
    if (options.returnDocument === "after") {
      return this.findOne(filter);
    }
    return before;
  }

  async findOneAndDelete(filter: Record<string, any>): Promise<T | null> {
    const doc = await this.findOne(filter);
    if (!doc) return null;
    await this.deleteOne(filter);
    return doc;
  }

  async distinct(field: string, filter: Record<string, any> = {}): Promise<any[]> {
    const pool = getMySQLPool();
    const columns = await getTableColumns(this.tableName);
    const { sql: whereSql, params } = parseFilter(this.tableName, columns, filter);
    const colExpr = columns.has(field) ? `\`${field}\`` : `JSON_VALUE(payload, '$.${field}')`;
    const sql = `SELECT DISTINCT ${colExpr} as val FROM \`${this.tableName}\` WHERE ${whereSql} AND ${colExpr} IS NOT NULL`;
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows.map((r) => r.val);
  }

  aggregate(pipeline: any[]): { toArray: () => Promise<any[]> } {
    return {
      toArray: async () => {
        // Fallback for aggregate pipelines: query matching rows and apply in-memory transformations
        const matchStage = pipeline.find((p) => p.$match)?.$match || {};
        const docs = await this.find(matchStage).toArray();

        // Check for common pipelines like $group or $lookup
        const groupStage = pipeline.find((p) => p.$group)?.$group;
        if (groupStage) {
          const groups = new Map<string, any>();
          for (const doc of docs) {
            const keyField = typeof groupStage._id === "string" && groupStage._id.startsWith("$")
              ? groupStage._id.slice(1)
              : null;
            const groupKey = keyField ? String((doc as any)[keyField] ?? "null") : "all";

            if (!groups.has(groupKey)) {
              groups.set(groupKey, { _id: keyField ? (doc as any)[keyField] : null, count: 0 });
            }
            const g = groups.get(groupKey);
            g.count++;
          }
          return Array.from(groups.values());
        }

        return docs;
      },
    };
  }
}

// ── Database Class ───────────────────────────────────────────────────────────

export class MySQLDatabase {
  public readonly databaseName: string = MYSQL_DATABASE;

  async command(_cmd: any): Promise<{ ok: number }> {
    const pool = getMySQLPool();
    await pool.query("SELECT 1");
    return { ok: 1 };
  }

  collection<T = any>(name: string): MySQLCollection<T> {
    return new MySQLCollection<T>(name);
  }

  async listCollections(): Promise<Array<{ name: string }>> {
    const pool = getMySQLPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      [MYSQL_DATABASE]
    );
    return rows.map((r) => ({ name: String(r.name) }));
  }
}

// ── Singleton Database Instance ──────────────────────────────────────────────

let dbInstance: MySQLDatabase | null = null;

export async function getDb(): Promise<MySQLDatabase> {
  if (!dbInstance) {
    dbInstance = new MySQLDatabase();
  }
  return dbInstance;
}

/**
 * Execute an operation within a managed MySQL InnoDB ACID transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK on error.
 */
export async function withTransaction<T>(
  callback: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const pool = getMySQLPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getMongoClient(): Promise<{ db: (name?: string) => MySQLDatabase; close: () => Promise<void> }> {
  const db = await getDb();
  return {
    db: () => db,
    close: async () => {
      if (globalPool) {
        await globalPool.end();
        globalPool = null;
      }
    },
  };
}

export const clientPromise = Promise.resolve(getMongoClient());
