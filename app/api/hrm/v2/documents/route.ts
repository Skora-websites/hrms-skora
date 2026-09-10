import { NextRequest, NextResponse } from "next/server";
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  verifyDocument,
  getDocumentCategories,
  createDocumentCategory,
  getDocumentTemplates,
  createDocumentTemplate,
} from "@/services/hrm/documents";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId");
    const type = searchParams.get("type");

    if (type === "categories") {
      const categories = await getDocumentCategories(tenantId);
      return NextResponse.json({ data: categories });
    }

    if (type === "templates") {
      const templates = await getDocumentTemplates(tenantId);
      return NextResponse.json({ data: templates });
    }

    if (id) {
      const doc = await getDocumentById(id);
      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      // Employees can only view their own documents
      if (auth.role === "employee" && doc.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ data: doc });
    }

    // Employees can only view their own documents
    const filterUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    const documents = await getDocuments(tenantId, {
      userId: filterUserId,
      categoryId: categoryId || undefined,
    });

    return NextResponse.json({ data: documents });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/documents error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const title = formData.get("title") as string;
      const docUserId = formData.get("userId") as string;
      const categoryId = formData.get("categoryId") as string;
      const description = formData.get("description") as string;

      if (!file || !title || !docUserId) {
        return NextResponse.json({ error: "Missing required fields: file, title, userId" }, { status: 400 });
      }

      // Employees can only upload their own documents
      if (auth.role === "employee" && docUserId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const doc = await uploadDocument(tenantId, {
        categoryId: categoryId || "",
        userId: docUserId,
        title,
        description: description || undefined,
        file: buffer,
        fileName: file.name,
        mimeType: file.type,
      });

      return NextResponse.json({ data: doc }, { status: 201 });
    }

    // Only admins can manage document categories/templates
    if (auth.role === "employee") {
      return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const type = body.type;

    let result;

    if (type === "category") {
      result = await createDocumentCategory(tenantId, body);
    } else if (type === "template") {
      result = await createDocumentTemplate(tenantId, body);
    } else {
      return NextResponse.json({ error: "Invalid type. Use: category, template" }, { status: 400 });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/documents error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();

    if (body.verify) {
      const doc = await verifyDocument(id, body.verifiedById);
      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ data: doc });
    }

    // Support general document updates (title, category, status, etc.)
    const updateData: Record<string, any> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.description !== undefined) updateData.description = body.description;

    if (Object.keys(updateData).length > 0) {
      // Reuse existing service to update
      const updated = await updateDocument(id, updateData);
      if (!updated) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/documents error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const deleted = await deleteDocument(id);
    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/documents error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
