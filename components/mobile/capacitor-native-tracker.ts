import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Capacitor Native Background Tracker
 *
 * ANDROID:
 *   - Foreground Service with persistent notification
 *   - FusedLocationProvider (battery-efficient GPS)
 *   - Runs even when app is in background/minimized
 *   - Notification: "Skora HRMS — Tracking your location"
 *   - Interval: 30 seconds
 *
 * iOS:
 *   - Background Modes (location, background-fetch)
 *   - "Always Allow" location permission required
 *   - Significant location change monitoring
 *   - Background fetch for periodic wake-ups
 *   - Interval: 60 seconds (iOS throttles more aggressively)
 */

interface TrackerOptions {
  intervalMs?: number;
  onLocation?: (lat: number, lng: number, accuracy: number) => void;
  onError?: (error: string) => void;
}

// Register custom Capacitor plugin (native code)
interface BackgroundLocationPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  startForegroundService(options: {
    title: string;
    body: string;
    intervalMs: number;
    channelId: string;
    channelName: string;
  }): Promise<{ started: boolean }>;
  stopForegroundService(): Promise<{ stopped: boolean }>;
  getCurrentPosition(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }>;
  addListener(event: string, callback: (data: any) => void): Promise<{ remove: () => void }>;
}

const BackgroundLocation = registerPlugin<BackgroundLocationPlugin>("BackgroundLocation");

export class BackgroundTracker {
  private options: TrackerOptions;
  private listenerHandle: any = null;
  private isRunning = false;

  constructor(options: TrackerOptions) {
    this.options = options;
  }

  async requestPermission(): Promise<boolean> {
    try {
      const result = await BackgroundLocation.requestPermission();
      return result.granted;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.options.onError?.("Permission error: " + msg);
      return false;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const platform = Capacitor.getPlatform();
    const intervalMs = this.options.intervalMs || (platform === "ios" ? 60000 : 30000);

    try {
      if (platform === "android") {
        // Android: Start foreground service with persistent notification
        await BackgroundLocation.startForegroundService({
          title: "Skora HRMS",
          body: "Tracking your location for attendance",
          intervalMs,
          channelId: "skora-location",
          channelName: "Location Tracking",
        });
      } else if (platform === "ios") {
        // iOS: Start background location updates
        await BackgroundLocation.startForegroundService({
          title: "Skora HRMS",
          body: "Location tracking active",
          intervalMs,
          channelId: "skora-location",
          channelName: "Location Tracking",
        });
      }

      // Listen for location updates from native side
      this.listenerHandle = await BackgroundLocation.addListener(
        "locationUpdate",
        (data: { latitude: number; longitude: number; accuracy: number }) => {
          this.options.onLocation?.(data.latitude, data.longitude, data.accuracy);
        }
      );

      this.isRunning = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.options.onError?.("Start error: " + msg);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (this.listenerHandle) {
        this.listenerHandle.remove();
        this.listenerHandle = null;
      }

      await BackgroundLocation.stopForegroundService();
      this.isRunning = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.options.onError?.("Stop error: " + msg);
    }
  }

  async getCurrentPosition(): Promise<{ lat: number; lng: number; acc: number } | null> {
    try {
      const pos = await BackgroundLocation.getCurrentPosition();
      return { lat: pos.latitude, lng: pos.longitude, acc: pos.accuracy };
    } catch {
      return null;
    }
  }
}
