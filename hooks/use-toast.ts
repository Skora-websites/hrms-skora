"use client";

import { useState, useCallback, useRef } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addToast = useCallback(
    (variant: ToastVariant, message: string, description?: string, duration = 4000) => {
      const id = `toast-${++toastIdCounter}`;
      const toast: ToastItem = { id, variant, message, description };
      setToasts((prev) => [...prev, toast]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, duration);
      timersRef.current.set(id, timer);

      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, description?: string) => addToast("success", message, description),
    [addToast]
  );

  const error = useCallback(
    (message: string, description?: string) => addToast("error", message, description),
    [addToast]
  );

  const warning = useCallback(
    (message: string, description?: string) => addToast("warning", message, description),
    [addToast]
  );

  const info = useCallback(
    (message: string, description?: string) => addToast("info", message, description),
    [addToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    dismissToast,
    clearAll,
  };
}
