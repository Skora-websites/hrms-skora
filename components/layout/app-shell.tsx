"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { RouteGuard } from "@/components/shared/route-guard";
import { useBreakpoint } from "@/hooks/use-media-query";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  return (
    <RouteGuard>
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        {/* Desktop Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div
          className="flex flex-col min-h-screen ml-0 md:ml-[var(--sidebar-width,270px)] transition-[margin-left] duration-200"
        >
          {/* Mobile Top Header */}
          <MobileHeader title={title} />

          {/* Desktop Top Navbar */}
          <div className="hidden md:block">
            <Navbar
              onMenuClick={() => setSidebarOpen(true)}
              title={title}
            />
          </div>

          {/* Main Viewport Content */}
          <main className="p-3 sm:p-5 md:p-6 lg:p-8 flex-1 pb-28 md:pb-8">
            <div className="mx-auto max-w-7xl space-y-5">
              {children}
            </div>
          </main>

          {/* Desktop Footer (Hidden on Mobile) */}
          <footer className="hidden md:block border-t border-border/70 py-4 px-6 lg:px-8 bg-card/40 backdrop-blur-sm mt-auto">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} SKORA HRMS. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse motion-reduce:animate-none" />
                  Systems Operational
                </span>
                <span>Enterprise Portal</span>
              </div>
            </div>
          </footer>
        </div>

        {/* Persistent Native Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </RouteGuard>
  );
}
