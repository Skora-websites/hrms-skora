import { NextRequest, NextResponse } from "next/server";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
} from "@/services/hrm/expenses";
import { requireAuth, requireHrLevel, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, badRequest, notFound } from "@/lib/api-handler";

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
    monthlyCap: monthlyCap !== undefined ? Number(monthlyCap) : 0,
    requiresReceipt: requiresReceipt !== undefined ? Boolean(requiresReceipt) : true,
    description: description?.trim(),
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
});

export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const auth = await requireHrLevel();
  if (isErrorResponse(auth)) return auth;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Request body must be valid JSON");

  const { id, name, monthlyCap, requiresReceipt, description, status } = body;
  if (!id) return badRequest("Category ID is required");

  const updated = await updateExpenseCategory(id, {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(monthlyCap !== undefined ? { monthlyCap: Number(monthlyCap) } : {}),
    ...(requiresReceipt !== undefined ? { requiresReceipt: Boolean(requiresReceipt) } : {}),
    ...(description !== undefined ? { description: description.trim() } : {}),
    ...(status !== undefined ? { status } : {}),
  });

  if (!updated) return notFound("Category not found");
  return NextResponse.json({ success: true, data: updated, message: "Category policy updated" });
});
