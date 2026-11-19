"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If it is a chunk load error, automatically attempt reload
    const isChunk =
      error?.name === "ChunkLoadError" ||
      /ChunkLoadError/i.test(error?.message || "") ||
      /Failed to load chunk/i.test(error?.message || "");

    if (isChunk) {
      try {
        const lastReload = sessionStorage.getItem("chunk_reload_timestamp");
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10000) {
          sessionStorage.setItem("chunk_reload_timestamp", String(now));
          window.location.reload();
          return;
        }
      } catch {
        window.location.reload();
        return;
      }
    }

    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Application Update or Network Interruption</h2>
          <p className="text-xs text-muted-foreground mt-1">
            A newer version of the application was deployed or the connection was interrupted. Reload to fetch the latest assets.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reset()}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Try again
          </Button>
          <Button
            size="sm"
            onClick={() => window.location.reload()}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
