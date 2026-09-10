"use client";

import { ThemeProvider as ThemeContextProvider } from "@/hooks/use-theme";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContextProvider>
      <TooltipProvider delayDuration={200}>
        {children}
      </TooltipProvider>
    </ThemeContextProvider>
  );
}
