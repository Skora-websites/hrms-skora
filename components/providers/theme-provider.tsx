"use client";

import { ThemeProvider as ThemeContextProvider } from "@/hooks/use-theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChunkErrorHandler } from "./chunk-error-handler";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContextProvider>
      <TooltipProvider delayDuration={200}>
        <ChunkErrorHandler />
        {children}
      </TooltipProvider>
    </ThemeContextProvider>
  );
}
