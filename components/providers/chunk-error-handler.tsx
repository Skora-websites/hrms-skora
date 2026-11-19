"use client";

import { useEffect } from "react";

/**
 * Handles Next.js/Turbopack chunk loading failures automatically.
 * When code changes occur or new deployments invalidate old chunk hashes,
 * stale client tabs attempt to fetch obsolete chunks and crash with ChunkLoadError.
 * This handler catches those failures and performs a clean one-time reload to fetch
 * the fresh build manifest and assets.
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    function isChunkError(err: any): boolean {
      if (!err) return false;
      const msg = typeof err === "string" ? err : err.message || "";
      const name = err.name || "";
      return (
        name === "ChunkLoadError" ||
        /ChunkLoadError/i.test(msg) ||
        /Failed to load chunk/i.test(msg) ||
        /Loading chunk .* failed/i.test(msg)
      );
    }

    function recover() {
      try {
        const lastReload = sessionStorage.getItem("chunk_reload_timestamp");
        const now = Date.now();
        // Prevent reload loop by enforcing a 10s cooldown
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem("chunk_reload_timestamp", String(now));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }

    function handleError(event: ErrorEvent) {
      if (isChunkError(event.error) || isChunkError(event.message)) {
        recover();
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      if (isChunkError(event.reason)) {
        recover();
      }
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
