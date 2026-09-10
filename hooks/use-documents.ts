"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Document, DocumentCategory } from "@/types";

/**
 * Hook to fetch documents.
 */
export function useDocuments(params?: Record<string, string>) {
  return useCollection<Document>("/api/hrm/v2/documents", params);
}

/**
 * Hook to fetch document categories.
 */
export function useDocumentCategories() {
  return useCollection<DocumentCategory>("/api/hrm/v2/documents/categories");
}
