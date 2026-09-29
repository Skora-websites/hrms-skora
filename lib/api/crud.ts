import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { ObjectId } from "mongodb";

// Generic CRUD factory for simple CRM collections (leads, contacts, ...).
// GET returns a bare array — useApiData consumers expect the raw body.
//
// Writes are allowlisted per collection: the UI forms only ever send these
// fields, so anything else in a request body is dropped instead of being
// persisted (mass-assignment guard — mirrors the HRMS API's SAFE_FIELDS rule).

type Doc = Record<string, any>;

const FIELD_ALLOWLISTS: Record<string, string[]> = {
  contacts: ["name", "email", "phone", "company", "position", "website", "address", "industry", "status", "notes", "lastContact"],
  leads: ["name", "company", "email", "phone", "source", "status", "value", "probability", "notes"],
  customers: ["name", "company", "email", "phone", "website", "industry", "status", "lifetimeValue", "notes"],
  deals: ["name", "company", "email", "phone", "value", "stage", "status", "probability", "expectedCloseDate", "notes"],
  activities: ["type", "subject", "description", "relatedTo", "relatedId", "date", "status", "notes"],
  tasks: ["title", "description", "status", "priority", "assignee", "dueDate", "relatedTo", "relatedId", "notes"],
};

/** Keep only allowlisted fields (defaults to a strict safe set when the collection is unknown). */
function sanitize(body: Doc, collection: string): Doc {
  const allow = FIELD_ALLOWLISTS[collection] || ["name", "email", "phone", "status", "notes", "description"];
  const out: Doc = {};
  for (const key of allow) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function serialize(d: Doc): Doc {
  return { ...d, id: d._id?.toString(), _id: undefined };
}

export function createCrudRoute(collectionName: string) {
  const GET = async (request: NextRequest) => {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const doc = await db.collection(collectionName).findOne({ _id: new ObjectId(id) });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(serialize(doc));
    }
    const rows = await db.collection(collectionName).find({}).sort({ createdAt: -1 }).limit(500).toArray();
    return NextResponse.json(rows.map(serialize));
  };

  const POST = async (request: NextRequest) => {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
    const body = await request.json();
    const doc = { ...sanitize(body, collectionName), createdAt: new Date(), updatedAt: new Date() };
    const r = await db.collection(collectionName).insertOne(doc);
    return NextResponse.json(serialize({ ...doc, _id: r.insertedId }));
  };

  const PATCH = async (request: NextRequest) => {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const id = searchParams.get("id") || body.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updates = { ...sanitize(body, collectionName), updatedAt: new Date() };
    const r = await db.collection(collectionName).findOneAndUpdate(
      { _id: new ObjectId(id) }, { $set: updates }, { returnDocument: "after" }
    );
    if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serialize(r));
  };

  const DELETE = async (request: NextRequest) => {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const r = await db.collection(collectionName).deleteOne({ _id: new ObjectId(id) });
    if (r.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  };

  return { GET, POST, PATCH, DELETE };
}
