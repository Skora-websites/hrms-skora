import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongo-helper";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    // Always use the authenticated user's ID, never trust client-provided userId
    const userId = auth.userId;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, PNG, JPG, DOC, DOCX" },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const fileName = `onboarding/${userId}/${timestamp}_${file.name}`;

    // Convert File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Save metadata and document to MongoDB
    const db = await getDb();
    if (db) {
      // Also update the employee_onboarding_tasks record so CEO/HR can see the document
      const task = await db.collection("employee_onboarding_tasks").findOne({ userId });
      if (task) {
        await db.collection("employee_onboarding_tasks").updateOne(
          { _id: task._id },
          { $set: { documentName: file.name, documentUrl: dataUrl, updatedAt: new Date() } }
        );
      }

      await db.collection("onboardingDocuments").insertOne({
        userId,
        fileName: file.name,
        fileUrl: dataUrl,
        storagePath: fileName,
        fileSize: file.size,
        mimeType: file.type,
        status: "pending",
        uploadedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileUrl: dataUrl,
        storagePath: fileName,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Upload failed" },
      { status: 500 }
    );
  }
}
