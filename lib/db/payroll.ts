import { getDb } from "./mongo-helper";
import { ObjectId } from "mongodb";

export interface PayrollRun {
  _id?: string;
  tenantId?: string;
  month: number; // 1-12
  year: number;
  status: "DRAFT" | "PROCESSING" | "COMPLETED";
  totalEmployees: number;
  totalAmount: number;
  createdBy: string;
  processedAt?: string;
  createdAt?: string;
}

export interface Payslip {
  _id?: string;
  payrollRunId?: string;
  tenantId?: string;
  userId: string;
  userName: string;
  month: number;
  year: number;
  baseSalary: number;
  billableHours: number;
  billableAmount: number;
  deductions: { name: string; amount: number }[];
  netPay: number;
  status: "PENDING" | "PAID";
  pdfUrl?: string;
  generatedAt?: string;
}

export async function getPayrollRuns(tenantId?: string): Promise<PayrollRun[]> {
  const db = await getDb();
  if (!db) return [];

  const query: Record<string, unknown> = {};
  if (tenantId) query.tenantId = tenantId;

  const docs = await db.collection("payroll_runs").find(query).sort({ year: -1, month: -1 }).toArray();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    processedAt: d.processedAt ? d.processedAt.toISOString() : undefined,
    createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
  })) as PayrollRun[];
}

export async function getPayslips(userId?: string, month?: number, year?: number): Promise<Payslip[]> {
  const db = await getDb();
  if (!db) return [];

  const query: Record<string, unknown> = {};
  if (userId) query.userId = userId;
  if (month) query.month = month;
  if (year) query.year = year;

  const docs = await db.collection("payslips").find(query).sort({ year: -1, month: -1 }).toArray();
  return docs.map((d) => ({
    ...d,
    _id: d._id.toString(),
    generatedAt: d.generatedAt ? d.generatedAt.toISOString() : new Date().toISOString(),
  })) as Payslip[];
}

export async function createPayrollRun(data: Omit<PayrollRun, "_id" | "createdAt">): Promise<PayrollRun | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const doc = {
    ...data,
    createdAt: now,
    processedAt: now,
  };

  const res = await db.collection("payroll_runs").insertOne(doc);
  return {
    ...doc,
    _id: res.insertedId.toString(),
    processedAt: now.toISOString(),
    createdAt: now.toISOString(),
  } as PayrollRun;
}

export async function createPayslip(data: Omit<Payslip, "_id" | "generatedAt">): Promise<Payslip | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const doc = {
    ...data,
    generatedAt: now,
  };

  const res = await db.collection("payslips").insertOne(doc);
  return {
    ...doc,
    _id: res.insertedId.toString(),
    generatedAt: now.toISOString(),
  } as Payslip;
}
