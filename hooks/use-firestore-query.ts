"use client";

import { useState, useEffect, useCallback } from "react";

export type DocumentData = Record<string, any>;

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for fetching data from an API endpoint.
 */
export function useFirestoreQuery<T = DocumentData>(
  url: string | null,
  options?: RequestInit
): FetchState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: !!url,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      setState({ data: result.data ?? result, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

/**
 * Hook for fetching a collection from an API endpoint.
 */
export function useCollection<T = DocumentData>(
  baseUrl: string | null,
  params?: Record<string, string>
): FetchState<T[]> & { refetch: () => Promise<void> } {
  const queryString = params
    ? "?" + new URLSearchParams(params).toString()
    : "";
  const url = baseUrl ? `${baseUrl}${queryString}` : null;

  const result = useFirestoreQuery<T[]>(url);

  return {
    data: result.data ?? [],
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}
