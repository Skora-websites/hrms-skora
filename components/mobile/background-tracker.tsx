"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/**
 * LAYER 1 — PWA Background GPS Tracker
 * 
 * Strategy:
 *   1. Wake Lock API — keeps screen on so GPS stays active
 *   2. Visibility API — resumes tracking when tab regains focus
 *   3. Push notification — alerts user if tracking stops
 *   4. Fallback timer — checks tracking health every 30s
 * 
 * Limitations:
 *   - iOS Safari kills background tabs after ~30 seconds
 *   - Android Chrome kills background tabs after ~5 minutes
 *   - Neither truly runs in background (use Capacitor Layer 2)
 */

interface BackgroundTrackerOptions {
  enabled: boolean;
  intervalMs?: number;
  onLocationUpdate?: (lat: number, lng: number, accuracy: number) => void;
  onTrackingStopped?: (reason: string) => void;
  onTrackingResumed?: () => void;
  serverUrl?: string;
}

interface TrackingState {
  isActive: boolean;
  wakeLockActive: boolean;
  method: "wake_lock" | "visibility" | "fallback" | "none";
  lastUpdate: string | null;
  pauseCount: number;
  resumeCount: number;
}

export function useBackgroundTracker(options: BackgroundTrackerOptions) {
  const {
    enabled,
    intervalMs = 30000,
    onLocationUpdate,
    onTrackingStopped,
    onTrackingResumed,
    serverUrl = "/api/hrm/v2/attendance/location",
  } = options;

  const [state, setState] = useState<TrackingState>({
    isActive: false,
    wakeLockActive: false,
    method: "none",
    lastUpdate: null,
    pauseCount: 0,
    resumeCount: 0,
  });

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number; acc: number } | null>(null);
  const isTrackingRef = useRef(false);

  const sendLocation = useCallback(async (lat: number, lng: number, acc: number) => {
    try {
      await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc }),
      });
      lastLocationRef.current = { lat, lng, acc };
      setState((s) => ({ ...s, lastUpdate: new Date().toISOString() }));
      onLocationUpdate?.(lat, lng, acc);
    } catch { /* retry next cycle */ }
  }, [serverUrl, onLocationUpdate]);

  const acquireWakeLock = useCallback(async (): Promise<boolean> => {
    if (!("wakeLock" in navigator)) return false;
    try {
      const wakeLock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = wakeLock;
      wakeLock.addEventListener("release", () => {
        wakeLockRef.current = null;
        setState((s) => ({ ...s, wakeLockActive: false }));
      });
      setState((s) => ({ ...s, wakeLockActive: true }));
      return true;
    } catch { return false; }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  const startGPS = useCallback(() => {
    if (isTrackingRef.current) return;
    isTrackingRef.current = true;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        sendLocation(latitude, longitude, accuracy);
      },
      (err) => console.warn("[BG Tracker] GPS error:", err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    setState((s) => ({ ...s, isActive: true }));
  }, [sendLocation]);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    setState((s) => ({ ...s, isActive: false }));
  }, []);

  const startHealthCheck = useCallback(() => {
    healthCheckRef.current = setInterval(() => {
      if (!isTrackingRef.current) return;
      if (!wakeLockRef.current && document.visibilityState === "visible") {
        acquireWakeLock();
      }
    }, intervalMs * 2);
  }, [intervalMs, acquireWakeLock]);

  useEffect(() => {
    if (!enabled) { stopGPS(); releaseWakeLock(); return; }
    const init = async () => {
      const hasWakeLock = await acquireWakeLock();
      startGPS();
      startHealthCheck();
      setState((s) => ({ ...s, method: hasWakeLock ? "wake_lock" : "fallback", isActive: true }));
    };
    init();
    return () => {
      stopGPS(); releaseWakeLock();
      if (healthCheckRef.current) clearInterval(healthCheckRef.current);
    };
  }, [enabled, acquireWakeLock, startGPS, stopGPS, releaseWakeLock, startHealthCheck]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && enabled) {
        if (!isTrackingRef.current) {
          startGPS(); acquireWakeLock();
          setState((s) => ({ ...s, resumeCount: s.resumeCount + 1, method: "visibility" }));
          onTrackingResumed?.();
        }
      } else if (document.visibilityState === "hidden") {
        setState((s) => ({ ...s, pauseCount: s.pauseCount + 1 }));
        onTrackingStopped?.("tab_hidden");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, startGPS, acquireWakeLock, onTrackingStopped, onTrackingResumed]);

  useEffect(() => {
    const handleFocus = () => { if (enabled && !wakeLockRef.current) acquireWakeLock(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, acquireWakeLock]);

  return {
    ...state,
    pause: stopGPS,
    resume: () => { startGPS(); acquireWakeLock(); },
    sendManualLocation: sendLocation,
  };
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function sendLocalNotification(title: string, body: string, url?: string) {
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: "skora-gps",
    data: { url: url || "/hrms/employee" },
  });
}
