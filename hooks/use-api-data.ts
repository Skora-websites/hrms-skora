"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ───────────────────────────────────────────────

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Hook ────────────────────────────────────────────────

/**
 * Generic hook to fetch data from an API endpoint.
 * Returns data, loading state, error state, and a refresh function.
 */
export function useApiData<T>(
  url: string | null,
  options?: {
    fallback?: T;
    autoRefresh?: boolean;
  }
): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(options?.fallback ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error || `Request failed with status ${res.status}`
        );
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      // Keep fallback data if we have it
      if (!options?.fallback) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options?.fallback]);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

// ── Utility Hooks ───────────────────────────────────────

/**
 * Hook to fetch leads from the API.
 */
export function useLeads() {
  return useApiData<import("@/types").Lead[]>("/api/leads");
}

/**
 * Hook to fetch customers from the API.
 */
export function useCustomers() {
  return useApiData<import("@/types").Customer[]>("/api/customers");
}

/**
 * Hook to fetch contacts from the API.
 */
export function useContacts() {
  return useApiData<import("@/types").Contact[]>("/api/contacts");
}

/**
 * Hook to fetch activities from the API.
 */
export function useActivities() {
  return useApiData<import("@/types").Activity[]>("/api/activities");
}

/**
 * Hook to fetch tasks from the API.
 */
export function useTasks() {
  return useApiData<import("@/types").Task[]>("/api/tasks");
}

/**
 * Hook to fetch deals from the API.
 */
export function useDeals() {
  return useApiData<import("@/types").Deal[]>("/api/deals");
}

/**
 * Hook to fetch dashboard stats from the API.
 */
export function useDashboardStats() {
  return useApiData<import("@/types").DashboardStats>("/api/dashboard/stats");
}
