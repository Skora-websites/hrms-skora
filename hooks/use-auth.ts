"use client";

import { useState, useEffect } from "react";
import type { HRMUser } from "@/types";

interface AuthState {
  user: HRMUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get the current authenticated user from session API.
 */
export function useCurrentUser(): AuthState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Not authenticated");

      const session = await res.json();
      if (session?.user) {
        setState({ user: session.user as HRMUser, loading: false, error: null });
      } else {
        // Try fetching user from custom session endpoint
        const userRes = await fetch("/api/auth/session");
        if (userRes.ok) {
          const userData = await userRes.json();
          setState({ user: userData.user ?? null, loading: false, error: null });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      }
    } catch (err) {
      setState({
        user: null,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch user",
      });
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return { ...state, refetch: fetchUser };
}
