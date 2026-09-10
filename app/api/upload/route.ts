import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

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

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP allowed" }, { status: 400 });
    }

    // Convert to base64 data URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = "data:" + file.type + ";base64," + base64;

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
