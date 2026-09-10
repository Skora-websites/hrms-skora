"use client";

import { useEffect } from "react";

/**
 * PWA Provider — Registers service worker and adds iOS Install Prompt
 * Works on iOS (Add to Home Screen), Android (Install Banner), and Desktop
 */
export function PWAProvider() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);

          // Check for updates periodically
          setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000); // Every hour
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    }

    // iOS "Add to Home Screen" prompt
    let deferredPrompt: any = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show custom install button/banner after 30 seconds
      setTimeout(() => {
        if (deferredPrompt) {
          showInstallBanner(deferredPrompt);
        }
      }, 30000);
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      console.log("[PWA] App installed successfully");
    });
  }, []);

  return null; // No UI — just registers SW
}

// ── Install Banner ─────────────────────────────────────────
function showInstallBanner(deferredPrompt: any) {
  // Don't show if already dismissed or installed
  if (localStorage.getItem("pwa-install-dismissed")) return;
  if (window.matchMedia("(display-mode: standalone)").matches) return;

  const banner = document.createElement("div");
  banner.id = "pwa-install-banner";
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div>
        <div style="font-weight: 700; font-size: 14px;">Install Skora HRMS</div>
        <div style="font-size: 12px; opacity: 0.9;">Add to home screen for quick access</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="pwa-install-btn" style="
          background: white;
          color: #6366f1;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
        ">✕</button>
      </div>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById("pwa-install-btn")?.addEventListener("click", async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] Install outcome:", outcome);
    deferredPrompt = null;
    banner.remove();
  });

  document.getElementById("pwa-dismiss-btn")?.addEventListener("click", () => {
    localStorage.setItem("pwa-install-dismissed", "true");
    banner.remove();
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (banner.parentElement) {
      localStorage.setItem("pwa-install-dismissed", "true");
      banner.remove();
    }
  }, 30000);
}

// ── iOS Install Instructions ───────────────────────────────
export function getIOSInstallInstructions(): string {
  return `To install Skora HRMS on iOS:
1. Open this page in Safari
2. Tap the Share button (↗)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right

The app will appear on your home screen!`;
}
