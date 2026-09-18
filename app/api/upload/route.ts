import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";
import { validateUpload } from "@/lib/upload-security";

/**
 * GET /api/upload?userId=xxx — Load profile image for a user
 * POST /api/upload — Upload profile image (base64 in MongoDB)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Employees can only view their own profile image
    if (auth.role === "employee" && userId !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ image: null });
    }

    const doc = await db.collection("profile-images").findOne({ userId });
    if (!doc) {
      return NextResponse.json({ image: null });
    }

    return NextResponse.json({ image: doc.image || null });
  } catch (error: any) {
    console.error("GET /api/upload error:", error);
    return NextResponse.json({ image: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Content-signature validation: the declared MIME/extension is ignored —
    // the bytes must match an allowlisted image format.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const check = validateUpload(buffer, file.name, {
      allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      maxBytes: 2 * 1024 * 1024,
    });
    if (!check.ok) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const base64 = buffer.toString("base64");
    const dataUrl = "data:" + check.mime + ";base64," + base64;

    // Always use authenticated userId - never trust client input
    const userId = auth.userId;

    // Save to MongoDB profile-images collection
    const db = await getDb();
    if (db) {
      await db.collection("profile-images").updateOne(
        { userId },
        { $set: { userId, image: dataUrl, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    return NextResponse.json({ url: dataUrl, userId });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
