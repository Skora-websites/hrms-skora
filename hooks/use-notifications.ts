"use client";

import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and manage notifications.
 */
export function useNotifications(userId: string | null): NotificationState & {
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: !!userId,
    error: null,
  });

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));
      const res = await fetch(`/api/hrm/v2/notifications?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");

      const data = await res.json();
      const notifications: Notification[] = data.data || data || [];
      const unreadCount = notifications.filter((n) => !n.isRead).length;

      setState({ notifications, unreadCount, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/hrm/v2/notifications/${id}/read`, { method: "PATCH" });
      setState((prev) => {
        const notifications = prev.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        );
        return {
          ...prev,
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        };
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(`/api/hrm/v2/notifications/read-all`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { ...state, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
