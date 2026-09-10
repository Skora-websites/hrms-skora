"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Asset, AssetCategory } from "@/types";

/**
 * Hook to fetch assets.
 */
export function useAssets(params?: Record<string, string>) {
  return useCollection<Asset>("/api/hrm/v2/assets", params);
}

/**
 * Hook to fetch asset categories.
 */
export function useAssetCategories() {
  return useCollection<AssetCategory>("/api/hrm/v2/assets/categories");
}
