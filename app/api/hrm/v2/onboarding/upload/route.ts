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

    // Validate file type (by MIME, falling back to extension — some browsers
    // send an empty MIME type for .docx/.doc).
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"];
    const lowerName = file.name.toLowerCase();
    const typeOk = allowedTypes.includes(file.type) || (file.type === "" && allowedExtensions.some((e) => lowerName.endsWith(e)));
    if (!typeOk) {
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
      let task = await db.collection("employee_onboarding_tasks").findOne(
        { userId, tenantId: "default" },
        { sort: { createdAt: -1 } }
      );
      // Older accounts never got a task row — create one so the uploaded
      // document is always attached and visible to HR.
      if (!task) {
        const { ObjectId } = await import("mongodb");
        const userFilter: Record<string, unknown> = ObjectId.isValid(userId)
          ? { _id: new ObjectId(userId) }
          : { _id: userId };
        const u = await db.collection("users").findOne(userFilter);
        await db.collection("employee_onboarding_tasks").insertOne({
          userId, tenantId: "default",
          employeeName: (u && (u.displayName || u.firstName)) || userId,
          email: (u && u.email) || "", department: (u && u.department) || "",
          status: "pending", createdAt: new Date(), updatedAt: new Date(),
        });
        task = await db.collection("employee_onboarding_tasks").findOne(
          { userId, tenantId: "default" },
          { sort: { createdAt: -1 } }
        );
      }
      if (task) {
        const wasRejected = (task as any).status === "rejected";
        await db.collection("employee_onboarding_tasks").updateOne(
          { _id: task._id },
          { $set: { documentName: file.name, documentUrl: dataUrl, status: "pending", resubmittedAt: wasRejected ? new Date() : (task as any).resubmittedAt, updatedAt: new Date() } }
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
