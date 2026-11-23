"use client";

import { useState, useEffect, useCallback } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
}

let toastIdCounter = 0;
let memoryToasts: ToastItem[] = [];
const listeners: Set<(toasts: ToastItem[]) => void> = new Set();
const activeTimers: Map<string, NodeJS.Timeout> = new Map();

function broadcast() {
  listeners.forEach((listener) => listener([...memoryToasts]));
}

export function toast(variant: ToastVariant, message: string, description?: string, duration = 4000) {
  const id = `toast-${++toastIdCounter}`;
  const item: ToastItem = { id, variant, message, description };
  memoryToasts.push(item);
  broadcast();

  const timer = setTimeout(() => {
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    activeTimers.delete(id);
    broadcast();
  }, duration);
  activeTimers.set(id, timer);

  return id;
}

toast.success = (message: string, description?: string) => toast("success", message, description);
toast.error = (message: string, description?: string) => toast("error", message, description);
toast.warning = (message: string, description?: string) => toast("warning", message, description);
toast.info = (message: string, description?: string) => toast("info", message, description);

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>(memoryToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, description?: string, duration = 4000) => {
      return toast(variant, message, description, duration);
    },
    []
  );

  const success = useCallback(
    (message: string, description?: string) => toast("success", message, description),
    []
  );

  const error = useCallback(
    (message: string, description?: string) => toast("error", message, description),
    []
  );

  const warning = useCallback(
    (message: string, description?: string) => toast("warning", message, description),
    []
  );

  const info = useCallback(
    (message: string, description?: string) => toast("info", message, description),
    []
  );

  const dismissToast = useCallback((id: string) => {
    const timer = activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      activeTimers.delete(id);
    }
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    broadcast();
  }, []);

  const clearAll = useCallback(() => {
    activeTimers.forEach((t) => clearTimeout(t));
    activeTimers.clear();
    memoryToasts = [];
    broadcast();
  }, []);

  return {
    toasts,
    addToast,
    success,
    error,
    warning,
    info,
    dismissToast,
    clearAll,
  };
}
