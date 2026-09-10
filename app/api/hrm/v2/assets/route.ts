import { NextRequest, NextResponse } from "next/server";
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetCategories,
  createAssetCategory,
  updateAssetCategory,
  getAssetTypes,
  createAssetType,
  updateAssetType,
  assignAsset,
  returnAsset,
  getAssetsDashboard,
} from "@/services/hrm/assets";
import { requireAuth, requireAdmin, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const dashboard = searchParams.get("dashboard");
    const userId = searchParams.get("userId");

    if (dashboard === "true") {
      // Only admins can view the dashboard
      if (auth.role === "employee") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const dashData = await getAssetsDashboard(tenantId);
      return NextResponse.json({ data: dashData });
    }

    if (type === "categories") {
      const categories = await getAssetCategories(tenantId);
      return NextResponse.json({ data: categories });
    }

    if (type === "types") {
      const types = await getAssetTypes(tenantId, categoryId || undefined);
      return NextResponse.json({ data: types });
    }

    if (id) {
      const asset = await getAssetById(id);
      if (!asset) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
      return NextResponse.json({ data: asset });
    }

    // Employees can only view their assigned assets
    const filterUserId = auth.role === "employee" ? auth.userId : (userId || undefined);
    const assets = await getAssets(tenantId, {
      categoryId: categoryId || undefined,
      assignedToUserId: filterUserId,
    });

    return NextResponse.json({ data: assets });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;
    const type = body.type;

    let result;

    if (action === "assign") {
      result = await assignAsset(tenantId, body.assetId, body.userId, body.condition);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    if (action === "return") {
      result = await returnAsset(body.assignmentId, body.condition, body.notes);
      if (!result) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }
      return NextResponse.json({ data: result });
    }

    if (type === "category") {
      result = await createAssetCategory(tenantId, body);
    } else if (type === "type") {
      result = await createAssetType(tenantId, body);
    } else {
      result = await createAsset(tenantId, body);
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/hrm/v2/assets error:", error);
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
    const type = body.type;

    let result;
    if (type === "category") {
      result = await updateAssetCategory(id, body);
    } else if (type === "type") {
      result = await updateAssetType(id, body);
    } else {
      result = await updateAsset(id, body);
    }

    if (!result) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("PATCH /api/hrm/v2/assets error:", error);
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

    const deleted = await deleteAsset(id);
    if (!deleted) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
