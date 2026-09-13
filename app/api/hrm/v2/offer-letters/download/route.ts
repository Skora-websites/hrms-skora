import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { getDb } from "@/lib/db/mongo-helper";
import { generateOfferLetterPdf, type OfferLetterPdfInput } from "@/lib/offer-letter-pdf";

/**
 * GET /api/hrm/v2/offer-letters/download?id=xxx
 * Downloads a password-protected PDF offer letter.
 * Employee can only download their own released offer letters.
 * PDF rendering lives in lib/offer-letter-pdf.ts (shared with the
 * offer-letter release email attachment).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const db = await getDb();
    if (!db) return NextResponse.json({ error: "Database not available" }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    const { ObjectId } = require("mongodb");
    const letter = await db.collection("offerLetters").findOne({ _id: new ObjectId(id) });
    if (!letter) return NextResponse.json({ error: "Offer letter not found" }, { status: 404 });

    // Only the owner or CEO can download
    if (auth.role !== "super_admin" && letter.userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Only released letters can be downloaded
    if (letter.status !== "released") {
      return NextResponse.json({ error: "Offer letter has not been released yet" }, { status: 400 });
    }

    // Load offer letter settings for branding
    const settingsDoc = await db.collection("settings").findOne({ key: "offer_letter_config" });
    const cfg = settingsDoc?.settings || {};

    const pdf = await generateOfferLetterPdf(letter as unknown as OfferLetterPdfInput, cfg);

    // Record the download (best-effort).
    try {
      await db.collection("offerLetters").updateOne(
        { _id: new ObjectId(id) },
        { $set: { downloadedAt: new Date() } }
      );
    } catch { /* non-fatal */ }

    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "X-Offer-Letter-Password": pdf.password,
      },
    });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/offer-letters/download error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
