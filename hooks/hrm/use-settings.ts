"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Setting } from "@/types";

/**
 * Hook to fetch settings.
 */
export function useSettings(category?: string) {
  const params = category ? { category } : undefined;
  return useCollection<Setting>("/api/hrm/v2/settings", params);
}

/**
 * Hook to fetch a single setting.
 */
export function useSetting(key: string | null) {
  return useFirestoreQuery<Setting>(
    key ? `/api/hrm/v2/settings?key=${key}` : null
  );
}
