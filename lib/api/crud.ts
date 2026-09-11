import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { ObjectId } from "mongodb";

// Generic CRUD factory for simple CRM collections (leads, contacts, ...).
// GET returns a bare array — useApiData consumers expect the raw body.

type Doc = Record<string, any>;

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
    const doc = { ...body, createdAt: new Date(), updatedAt: new Date() };
    delete doc.id; delete doc._id;
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
    const updates = { ...body, updatedAt: new Date() };
    delete updates.id; delete updates._id;
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
