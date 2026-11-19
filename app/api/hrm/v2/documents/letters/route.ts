import { NextRequest, NextResponse } from "next/server";
import {
  getLetterTemplates,
  getLetterTemplateById,
  createLetterTemplate,
  updateLetterTemplate,
  generateEmployeeLetter,
  getGeneratedLetters,
  getGeneratedLetterById,
} from "@/services/hrm/documents/letters";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (type === "templates") {
      const templates = await getLetterTemplates(tenantId);
      return NextResponse.json({ data: templates });
    }

    if (id) {
      const letter = await getGeneratedLetterById(id);
      if (!letter) {
        return NextResponse.json({ error: "Letter not found" }, { status: 404 });
      }
      if (auth.role === "employee" && letter.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ data: letter });
    }

    const userId = auth.role === "employee" ? auth.userId : (searchParams.get("userId") || undefined);
    const letters = await getGeneratedLetters(tenantId, userId);
    return NextResponse.json({ data: letters });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/documents/letters error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireHrLevel();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";
    const body = await request.json();
    const action = body.action;

    if (action === "create-template") {
      const template = await createLetterTemplate(tenantId, body);
      return NextResponse.json({ data: template }, { status: 201 });
    }

    if (action === "update-template") {
      if (!body.id) {
        return NextResponse.json({ error: "Template id is required" }, { status: 400 });
      }
      const updated = await updateLetterTemplate(body.id, body.data || body);
      return NextResponse.json({ data: updated });
    }

    if (action === "generate") {
      if (!body.templateCode || !body.userId) {
        return NextResponse.json({ error: "templateCode and userId are required" }, { status: 400 });
      }
      const letter = await generateEmployeeLetter(tenantId, {
        templateCode: body.templateCode,
        userId: body.userId,
        issuedBy: body.issuedBy || auth.userId || "HR Admin",
        customTokens: body.customTokens,
      });
      return NextResponse.json({ data: letter }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/documents/letters error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
