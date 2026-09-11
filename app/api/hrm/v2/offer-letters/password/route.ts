import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";

/**
 * GET /api/hrm/v2/offer-letters/password?id=xxx
 * Reveals the PDF password for a released offer letter.
 * Owner or super_admin only; never sent as a header during download.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const { ObjectId } = require("mongodb");
    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const letter = await db.collection("offerLetters").findOne({ _id: new ObjectId(id) });
    if (!letter) return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });

    if (auth.role !== "super_admin" && letter.userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (letter.status !== "released") {
      return NextResponse.json({ error: "Offer letter has not been released yet" }, { status: 400 });
    }
    if (!letter.password) {
      return NextResponse.json({ error: "No password set for this offer letter" }, { status: 404 });
    }

    return NextResponse.json({ data: { password: letter.password } });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/offer-letters/password error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
