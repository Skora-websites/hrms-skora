"use client";

import { useState, useCallback } from "react";

interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Method = "POST" | "PATCH" | "DELETE";

export function useMutation<T = any>() {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (url: string, method: Method, body?: any): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `HTTP ${res.status}: ${res.statusText}`
          );
        }

        const result = await res.json();
        const data = result.data ?? result;
        setState({ data, loading: false, error: null });
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    []
  );

  const createRecord = useCallback(
    (url: string, data: any) => mutate(url, "POST", data),
    [mutate]
  );

  const updateRecord = useCallback(
    (url: string, data: any) => mutate(url, "PATCH", data),
    [mutate]
  );

  const deleteRecord = useCallback(
    (url: string) => mutate(url, "DELETE"),
    [mutate]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    createRecord,
    updateRecord,
    deleteRecord,
    reset,
  };
}
