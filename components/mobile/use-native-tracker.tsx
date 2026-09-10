"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BackgroundTracker } from "./capacitor-native-tracker";
import { isNativeApp } from "./capacitor-provider";

/**
 * LAYER 2 — Capacitor Native Background GPS Tracker
 * 
 * Android: Foreground Service with persistent notification
 *   - Runs GPS in background even when app is minimized
 *   - Shows persistent notification ("Tracking your location")
 *   - Uses Android FusedLocationProvider for battery-efficient tracking
 *   - Interval: 30 seconds
 * 
 * iOS: Background Modes + Always Allow Location
 *   - Requires "Always Allow" location permission
 *   - Uses iOS significant location change monitoring
 *   - Background fetch + remote notifications for wake-ups
 *   - Interval: 60 seconds (iOS is stricter)
 * 
 * Both platforms:
 *   - Location sent to server every 30s (Android) / 60s (iOS)
 *   - Battery-optimized (distance filter, low accuracy when stationary)
 *   - Graceful degradation if permission denied
 */

interface NativeTrackerOptions {
  enabled: boolean;
  intervalMs?: number;
  onLocationUpdate?: (lat: number, lng: number, accuracy: number) => void;
  onTrackingStopped?: (reason: string) => void;
  onTrackingResumed?: () => void;
}

interface NativeTrackerState {
  isActive: boolean;
  platform: string;
  permissionGranted: boolean;
  lastUpdate: string | null;
  error: string | null;
}

export function useNativeBackgroundTracker(options: NativeTrackerOptions) {
  const { enabled, intervalMs, onLocationUpdate, onTrackingStopped, onTrackingResumed } = options;

  const [state, setState] = useState<NativeTrackerState>({
    isActive: false,
    platform: Capacitor.getPlatform(),
    permissionGranted: false,
    lastUpdate: null,
    error: null,
  });

  const trackerRef = useRef<BackgroundTracker | null>(null);

  useEffect(() => {
    if (!enabled || !isNativeApp()) return;

    const startTracking = async () => {
      try {
        const tracker = new BackgroundTracker({
          intervalMs: intervalMs || (Capacitor.getPlatform() === "ios" ? 60000 : 30000),
          onLocation: (lat: number, lng: number, acc: number) => {
            // Send to same server endpoint as PWA layer
            fetch("/api/hrm/v2/attendance/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc }),
            }).catch(() => {});

            setState((s) => ({ ...s, lastUpdate: new Date().toISOString() }));
            onLocationUpdate?.(lat, lng, acc);
          },
          onError: (err: string) => {
            setState((s) => ({ ...s, error: err }));
          },
        });

        const granted = await tracker.requestPermission();
        setState((s) => ({ ...s, permissionGranted: granted }));

        if (granted) {
          await tracker.start();
          trackerRef.current = tracker;
          setState((s) => ({ ...s, isActive: true, error: null }));
        }
      } catch (err) {
        setState((s) => ({ ...s, error: (err as Error).message }));
      }
    };

    startTracking();

    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }
    };
  }, [enabled, intervalMs, onLocationUpdate]);

  return {
    ...state,
    stop: () => {
      trackerRef.current?.stop();
      setState((s) => ({ ...s, isActive: false }));
      onTrackingStopped?.("manual_stop");
    },
  };
}
