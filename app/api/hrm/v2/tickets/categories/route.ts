import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse, requireAdmin } from "@/lib/api-auth";
import {
  getTicketCategories,
  createTicketCategory,
} from "@/services/hrm/tickets/category-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const categories = await getTicketCategories(auth.tenantId);
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const category = await createTicketCategory(auth.tenantId, {
      name: body.name.trim(),
      code: body.code,
      description: body.description,
      color: body.color,
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
