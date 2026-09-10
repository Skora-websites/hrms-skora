"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { isNativeApp } from "./capacitor-provider";
import { useBackgroundTracker } from "./background-tracker";
import { useNativeBackgroundTracker } from "./use-native-tracker";

/**
 * ──────────────────────────────────────────────────────────────
 * UNIFIED GPS TRACKER — Auto-selects Layer 1 or Layer 2
 * ──────────────────────────────────────────────────────────────
 *
 * This hook automatically chooses the best tracking method:
 *
 *   PWA (Browser):     Layer 1 — Wake Lock + watchPosition
 *                       Works on: Chrome, Safari, Edge
 *                       Background: ❌ (limited to ~30s iOS, ~5min Android)
 *
 *   Native (Capacitor): Layer 2 — Foreground Service (Android) / Background Modes (iOS)
 *                       Works on: Android 8+, iOS 13+
 *                       Background: ✅ True background GPS
 *
 * Usage:
 *   const gps = useGPSTracker({ enabled: punchedIn && !punchedOut });
 *   // gps.isActive, gps.lastUpdate, gps.method, gps.error
 *
 * ──────────────────────────────────────────────────────────────
 */

interface GPSTrackerOptions {
  enabled: boolean;
  intervalMs?: number;
}

interface GPSState {
  isActive: boolean;
  method: string;          // "wake_lock" | "visibility" | "fallback" | "native_foreground" | "none"
  lastUpdate: string | null;
  wakeLockActive?: boolean;
  permissionGranted?: boolean;
  pauseCount: number;
  resumeCount: number;
  error: string | null;
  platform: string;
  isNative: boolean;
}

export function useGPSTracker(options: GPSTrackerOptions) {
  const { enabled, intervalMs } = options;
  const isNative = isNativeApp();

  // Layer 1: PWA Tracker
  const pwaTracker = useBackgroundTracker({
    enabled: enabled && !isNative,
    intervalMs,
    onLocationUpdate: (lat, lng, acc) => {
      setState((s) => ({ ...s, lastUpdate: new Date().toISOString() }));
    },
    onTrackingStopped: (reason) => {
      setState((s) => ({ ...s, error: "Tracking paused: " + reason }));
    },
    onTrackingResumed: () => {
      setState((s) => ({ ...s, error: null }));
    },
  });

  // Layer 2: Native Tracker
  const nativeTracker = useNativeBackgroundTracker({
    enabled: enabled && isNative,
    intervalMs,
    onLocationUpdate: (lat, lng, acc) => {
      setState((s) => ({ ...s, lastUpdate: new Date().toISOString() }));
    },
    onTrackingStopped: (reason) => {
      setState((s) => ({ ...s, error: "Native tracking stopped: " + reason }));
    },
  });

  // Unified state
  const [state, setState] = useState<GPSState>({
    isActive: false,
    method: "none",
    lastUpdate: null,
    pauseCount: 0,
    resumeCount: 0,
    error: null,
    platform: typeof window !== "undefined" ? navigator.userAgent.includes("Android") ? "android" : "ios" : "unknown",
    isNative,
  });

  // Merge states from both layers
  useEffect(() => {
    if (isNative) {
      setState((s) => ({
        ...s,
        isActive: nativeTracker.isActive,
        method: nativeTracker.isActive ? "native_foreground" : "none",
        permissionGranted: nativeTracker.permissionGranted,
        error: nativeTracker.error,
        platform: nativeTracker.platform,
      }));
    } else {
      setState((s) => ({
        ...s,
        isActive: pwaTracker.isActive,
        method: pwaTracker.method,
        wakeLockActive: pwaTracker.wakeLockActive,
        lastUpdate: pwaTracker.lastUpdate || s.lastUpdate,
        pauseCount: pwaTracker.pauseCount,
        resumeCount: pwaTracker.resumeCount,
        error: null,
      }));
    }
  }, [
    isNative,
    nativeTracker.isActive, nativeTracker.permissionGranted, nativeTracker.error, nativeTracker.platform,
    pwaTracker.isActive, pwaTracker.method, pwaTracker.wakeLockActive, pwaTracker.lastUpdate,
    pwaTracker.pauseCount, pwaTracker.resumeCount,
  ]);

  return {
    ...state,
    stop: () => {
      if (isNative) nativeTracker.stop();
      else pwaTracker.pause();
    },
    resume: () => {
      if (!isNative) pwaTracker.resume();
    },
  };
}
