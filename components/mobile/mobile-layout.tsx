"use client";

import { useEffect, useState } from "react";
import { isNativeApp, getPlatform, triggerHaptic } from "./capacitor-provider";

// ── Mobile-specific CSS adjustments ────────────────────────
export function MobileStyles() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(isNativeApp());

    if (isNativeApp()) {
      // Add mobile-specific class to body
      document.body.classList.add("capacitor-native");

      // Platform-specific adjustments
      const platform = getPlatform();
      document.body.classList.add(`capacitor-${platform}`);

      // Prevent rubber-band scrolling on iOS
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
    }
  }, []);

  if (!isNative) return null;

  return (
    <style jsx global>{`
      /* ── Safe area insets for notched phones ── */
      .capacitor-native {
        padding-top: env(safe-area-inset-top) !important;
        padding-bottom: env(safe-area-inset-bottom) !important;
        padding-left: env(safe-area-inset-left) !important;
        padding-right: env(safe-area-inset-right) !important;
      }

      /* ── iOS-specific adjustments ── */
      .capacitor-ios {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }

      /* ── Android-specific adjustments ── */
      .capacitor-android {
        overscroll-behavior: none;
      }

      /* ── Hide scrollbar on mobile ── */
      .capacitor-native ::-webkit-scrollbar {
        display: none;
      }

      .capacitor-native * {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      /* ── Touch-friendly button sizes ── */
      .capacitor-native button,
      .capacitor-native a,
      .capacitor-native [role="button"] {
        min-height: 44px;
        min-width: 44px;
      }

      /* ── Better input handling on mobile ── */
      .capacitor-native input,
      .capacitor-native textarea,
      .capacitor-native select {
        font-size: 16px !important; /* Prevent iOS zoom on focus */
      }

      /* ── Status bar spacing ── */
      .capacitor-native .app-shell-header {
        padding-top: max(1rem, env(safe-area-inset-top));
      }

      /* ── Bottom navigation spacing ── */
      .capacitor-native .bottom-nav {
        padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
      }
    `}</style>
  );
}

// ── Mobile detection hook ──────────────────────────────────
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(
        isNativeApp() ||
        window.innerWidth < 768 ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

// ── Touch feedback helper ──────────────────────────────────
export function useTouchFeedback() {
  const handleTouch = () => {
    triggerHaptic();
  };

  return {
    onTouchStart: handleTouch,
  };
}
