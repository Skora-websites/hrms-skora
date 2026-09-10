import { getDb } from "./mongo-helper";
import { ObjectId } from "mongodb";

export interface Tenant {
  _id?: ObjectId | string;
  name: string;
  domain?: string;
  isActive: boolean;
  subscriptionTier: "basic" | "pro" | "enterprise";
  modulesEnabled: {
    pms: boolean;
    ats: boolean;
    payroll: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function getTenants(): Promise<Tenant[]> {
  const db = await getDb();
  if (!db) return [];
  const tenants = await db.collection<Tenant>("tenants").find({}).sort({ createdAt: -1 }).toArray();
  return tenants.map((t) => ({ ...t, _id: t._id?.toString() }));
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return null;
  const tenant = await db.collection<Tenant>("tenants").findOne({ _id: new ObjectId(id) });
  if (!tenant) return null;
  return { ...tenant, _id: tenant._id.toString() };
}

export async function createTenant(data: Omit<Tenant, "_id" | "createdAt" | "updatedAt">): Promise<Tenant | null> {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const doc: Omit<Tenant, "_id"> = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection("tenants").insertOne(doc);
  return { ...doc, _id: res.insertedId.toString() };
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<boolean> {
  const db = await getDb();
  if (!db || !ObjectId.isValid(id)) return false;
  const res = await db.collection("tenants").updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...updates, updatedAt: new Date() } }
  );
  return res.modifiedCount > 0;
}
