"use client";

import { useEffect, useState } from "react";

// ── Mobile-specific CSS adjustments ────────────────────────
export function MobileStyles() {
  return (
    <style jsx global>{`
      /* ── Touch-friendly input handling on mobile (prevent iOS zoom on focus) ── */
      @media (max-width: 768px) {
        input,
        textarea,
        select {
          font-size: 16px !important;
        }
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

// ── Touch feedback helper (Standard Web Vibration API) ──────
export function useTouchFeedback() {
  const handleTouch = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
  };

  return {
    onTouchStart: handleTouch,
  };
}
