"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Keyboard } from "@capacitor/keyboard";

// ── Detect if running in Capacitor native app ──────────────
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform(); // "ios" | "android" | "web"
}

// ── Capacitor Provider ─────────────────────────────────────
export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setReady(true);
      return;
    }

    const init = async () => {
      try {
        // ── Status Bar ──
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#0B0F19" });

        // ── Push Notifications ──
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();

          PushNotifications.addListener("registration", (token) => {
            console.log("Push token:", token.value);
            // Store token for server-side push
            localStorage.setItem("push_token", token.value);
          });

          PushNotifications.addListener("pushNotificationReceived", (notification) => {
            console.log("Push received:", notification);
          });

          PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
            console.log("Push action:", action);
            // Navigate to relevant screen based on notification data
            const data = action.notification.data;
            if (data?.url) {
              window.location.href = data.url;
            }
          });
        }

        // ── Keyboard adjustments ──
        Keyboard.addListener("keyboardWillShow", (info) => {
          document.body.style.paddingBottom = `${info.keyboardHeight}px`;
        });
        Keyboard.addListener("keyboardWillHide", () => {
          document.body.style.paddingBottom = "0";
        });

        // ── Hide splash screen ──
        await SplashScreen.hide();

        setReady(true);
      } catch (err) {
        console.error("Capacitor init error:", err);
        setReady(true); // Still render even if init fails
      }
    };

    init();
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}

// ── Haptic feedback helper ─────────────────────────────────
export async function triggerHaptic(style: ImpactStyle = ImpactStyle.Medium) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style });
  } catch { /* web fallback — no-op */ }
}

// ── Push token helper ──────────────────────────────────────
export function getStoredPushToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("push_token");
}
