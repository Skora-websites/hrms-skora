import { NextRequest, NextResponse } from "next/server";
import { getExpenseCategories, createExpenseCategory } from "@/services/hrm/expenses";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest } from "@/lib/api-handler";

export const GET = withErrorHandler(async () => {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const categories = await getExpenseCategories(tenantId);
  return NextResponse.json({ success: true, data: categories });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireHrLevel();
  if (isErrorResponse(auth)) return auth;

  const tenantId = "default";
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { name, code, monthlyCap, requiresReceipt, description } = body;
  if (!name || !name.trim()) return badRequest("Category name is required");
  if (!code || !code.trim()) return badRequest("Category code is required");

  const created = await createExpenseCategory(tenantId, {
    name: name.trim(),
    code: code.trim(),
    monthlyCap: monthlyCap ? Number(monthlyCap) : 0,
    requiresReceipt: requiresReceipt !== undefined ? Boolean(requiresReceipt) : true,
    description: description?.trim(),
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
});
