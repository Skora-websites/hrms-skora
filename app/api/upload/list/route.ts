import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    // Only admins can list all onboarding documents
    if (auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await getMongoClient();
    if (!client) {
      return NextResponse.json({ success: true, documents: [] });
    }
    const db = client.db("hrms");
    const docs = await db.collection("onboarding_documents").find({}).sort({ uploadedAt: -1 }).toArray();
    return NextResponse.json({ success: true, documents: docs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch documents" }, { status: 500 });
  }
}
