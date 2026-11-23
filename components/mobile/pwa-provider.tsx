"use client";

import { useEffect, useState } from "react";
import { WifiOff, Download, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * PWA Provider — Service Worker registration, offline connectivity monitoring,
 * and native-styled mobile install banner.
 */
export function PWAProvider() {
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // 1. Service Worker lifecycle
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ("caches" in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker active:", reg.scope);
            // Sync push subscription if notification permission is already granted
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              reg.pushManager.getSubscription().then((sub) => {
                if (sub) {
                  fetch("/api/hrm/v2/notifications/push", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "subscribe",
                      subscription: sub.toJSON(),
                      deviceType: isIOSDevice ? "ios" : "android",
                    }),
                  }).catch(() => {});
                }
              }).catch(() => {});
            }
            // Periodic update check
            setInterval(() => {
              reg.update();
            }, 60 * 60 * 1000);
          })
          .catch((err) => {
            console.warn("[PWA] SW registration skipped:", err);
          });
      }
    }

    // 2. Offline / Online Connectivity listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. Check standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // 4. iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 5. Native install prompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed && !isStandalone) {
        // Show subtle install banner after 10 seconds
        setTimeout(() => setShowInstallPrompt(true), 10000);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      localStorage.setItem("pwa-installed", "true");
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-installed", "true");
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismissInstall = () => {
    localStorage.setItem("pwa-install-dismissed", "true");
    setShowInstallPrompt(false);
  };

  return (
    <>
      {/* Offline Status Pill Bar */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-2 max-w-lg mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Offline mode — You are disconnected. Punches will sync once reconnected.
            </span>
          </div>
        </aside>
      )}

      {/* Modern PWA Install Banner */}
      {showInstallPrompt && (
        <aside
          aria-label="Install App"
          className="fixed bottom-18 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">Install Skora HRMS</p>
              <p className="text-[11px] text-muted-foreground">Add to Home Screen for fast mobile access</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary/90"
              onClick={handleInstallClick}
            >
              Install
            </Button>
            <button
              onClick={handleDismissInstall}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
