// ══════════════════════════════════════════════════════════════
// Skora HRMS — Service Worker (PWA)
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = "skora-hrms-v3";
const STATIC_CACHE = "skora-hrms-static-v3";
const DYNAMIC_CACHE = "skora-hrms-dynamic-v3";

// Assets to pre-cache (app shell)
const PRE_CACHE_URLS = [
  "/",
  "/hrms/login",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install Event ──────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(PRE_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ── Activate Event ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch Event — Network-first with cache fallback ────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip chrome-extension, moz-extension, or any non-http(s) schemes
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Never intercept in local development
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;

  // Never intercept Next.js chunks, build artifacts, dev HMR, or Vercel analytics
  if (url.pathname.startsWith("/_next/")) return;
  if (url.pathname.startsWith("/__nextjs")) return;
  if (url.pathname.startsWith("/_vercel")) return;

  // Skip API calls (always go to network)
  if (url.pathname.startsWith("/api/")) return;

  // Skip admin routes (different auth)
  if (url.pathname.startsWith("/admin")) return;

  // Strategy: Network-first for HTML pages, stale-while-revalidate for assets.
  if (request.headers.get("accept")?.includes("text/html")) {
    // HTML pages — network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const loginFallback = await caches.match("/hrms/login");
          if (loginFallback) return loginFallback;
          return new Response("Offline. Please reconnect to the network.", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" }),
          });
        })
    );
  } else {
    // Static assets — stale-while-revalidate
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          if (cached) return cached;
          return new Response("", { status: 404, statusText: "Not Found" });
        }
      })
    );
  }
});

// ── Push Notification Event ────────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {
    title: "Skora HRMS",
    body: "You have a new notification",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: "/hrms/employee" },
  };

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "skora-notification",
    renotify: true,
    data: data.data || { url: "/hrms/employee" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification Click Event ───────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/hrms/employee";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window if not open
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
