// ══════════════════════════════════════════════════════════════
// Skora HRMS — Service Worker (PWA)
// ══════════════════════════════════════════════════════════════

const CACHE_NAME = "skora-hrms-v1";
const STATIC_CACHE = "skora-hrms-static-v1";
const DYNAMIC_CACHE = "skora-hrms-dynamic-v1";

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
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API calls (always go to network)
  if (url.pathname.startsWith("/api/")) return;

  // Skip admin routes (different auth)
  if (url.pathname.startsWith("/admin")) return;

  // Strategy: Network-first for HTML pages, Cache-first for static assets
  if (request.headers.get("accept")?.includes("text/html")) {
    // HTML pages — network first, fallback to cache
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/hrms/login");
          });
        })
    );
  } else {
    // Static assets — cache first, fallback to network
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
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
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
