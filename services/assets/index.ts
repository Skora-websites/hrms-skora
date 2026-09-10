import "server-only";
import {
  assetsService,
  assetCategoriesService,
  assetTypesService,
  assetAssignmentsService,
} from "@/lib/hrm/firestore";
import type {
  Asset,
  AssetCategory,
  AssetType,
  AssetAssignment,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Assets Service
// ══════════════════════════════════════════════════════════════════

// ── Categories ─────────────────────────────────────────

export async function getAssetCategories(tenantId: string): Promise<AssetCategory[]> {
  return assetCategoriesService.findManyInTenant(tenantId, {
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getAssetCategoryById(id: string): Promise<AssetCategory | null> {
  return assetCategoriesService.findById(id);
}

export async function createAssetCategory(tenantId: string, data: Partial<AssetCategory>): Promise<AssetCategory> {
  return assetCategoriesService.create({ ...data, tenantId } as any);
}

export async function updateAssetCategory(id: string, data: Partial<AssetCategory>): Promise<AssetCategory | null> {
  return assetCategoriesService.update(id, data as any);
}

export async function deleteAssetCategory(id: string): Promise<boolean> {
  return assetCategoriesService.delete(id);
}

// ── Asset Types ────────────────────────────────────────

export async function getAssetTypes(tenantId: string, categoryId?: string): Promise<AssetType[]> {
  const where = categoryId ? [{ field: "categoryId", op: "==" as const, value: categoryId }] : [];
  return assetTypesService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getAssetTypeById(id: string): Promise<AssetType | null> {
  return assetTypesService.findById(id);
}

export async function createAssetType(tenantId: string, data: Partial<AssetType>): Promise<AssetType> {
  return assetTypesService.create({ ...data, tenantId } as any);
}

export async function updateAssetType(id: string, data: Partial<AssetType>): Promise<AssetType | null> {
  return assetTypesService.update(id, data as any);
}

// ── Assets ─────────────────────────────────────────────

export async function getAssets(
  tenantId: string,
  options: {
    categoryId?: string;
    typeId?: string;
    status?: Asset["status"];
    assignedToUserId?: string;
  } = {}
): Promise<Asset[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (options.categoryId) where.push({ field: "categoryId", op: "==", value: options.categoryId });
  if (options.typeId) where.push({ field: "typeId", op: "==", value: options.typeId });
  if (options.status) where.push({ field: "status", op: "==", value: options.status });

  return assetsService.findManyInTenant(tenantId, {
    where,
    orderByField: "name",
    orderByDirection: "asc",
  });
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return assetsService.findById(id);
}

export async function createAsset(tenantId: string, data: Partial<Asset>): Promise<Asset> {
  return assetsService.create({ ...data, tenantId } as any);
}

export async function updateAsset(id: string, data: Partial<Asset>): Promise<Asset | null> {
  return assetsService.update(id, data as any);
}

export async function deleteAsset(id: string): Promise<boolean> {
  return assetsService.delete(id);
}

// ── Asset Assignments ──────────────────────────────────

export async function getAssignments(
  assetId?: string,
  userId?: string
): Promise<AssetAssignment[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (assetId) where.push({ field: "assetId", op: "==", value: assetId });
  if (userId) where.push({ field: "userId", op: "==", value: userId });

  return assetAssignmentsService.findMany({
    where,
    orderByField: "assignedDate",
    orderByDirection: "desc",
  });
}

export async function assignAsset(
  tenantId: string,
  assetId: string,
  userId: string,
  condition: string
): Promise<AssetAssignment> {
  await assetsService.update(assetId, { status: "assigned" } as any);

  return assetAssignmentsService.create({
    assetId,
    userId,
    assignedDate: new Date(),
    conditionAtAssignment: condition,
    status: "active",
    tenantId,
  } as any);
}

export async function returnAsset(
  assignmentId: string,
  condition: string,
  notes?: string
): Promise<AssetAssignment | null> {
  const assignment = await assetAssignmentsService.findById(assignmentId);
  if (!assignment) return null;

  await assetsService.update(assignment.assetId, { status: "available" } as any);

  return assetAssignmentsService.update(assignmentId, {
    returnedDate: new Date(),
    conditionAtReturn: condition,
    notes,
    status: "returned",
  } as any);
}

export async function getActiveAssignmentsForUser(userId: string): Promise<AssetAssignment[]> {
  return assetAssignmentsService.findMany({
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "status", op: "==", value: "active" },
    ],
  });
}

// ── Dashboard ──────────────────────────────────────────

export async function getAssetsDashboard(tenantId: string): Promise<{
  totalAssets: number;
  available: number;
  assigned: number;
  underMaintenance: number;
  disposed: number;
  totalCategories: number;
}> {
  const [assets, categories] = await Promise.all([
    getAssets(tenantId),
    getAssetCategories(tenantId),
  ]);

  return {
    totalAssets: assets.length,
    available: assets.filter((a) => a.status === "available").length,
    assigned: assets.filter((a) => a.status === "assigned").length,
    underMaintenance: assets.filter((a) => a.status === "under_maintenance").length,
    disposed: assets.filter((a) => a.status === "disposed").length,
    totalCategories: categories.length,
  };
}
