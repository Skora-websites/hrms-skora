"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { RouteGuard } from "@/components/shared/route-guard";
import { useBreakpoint } from "@/hooks/use-media-query";
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
      <div className="min-h-screen bg-gray-50 dark:bg-[#051139]">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div
          className={cn(
            "transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isMobile ? "ml-0" : "ml-[var(--sidebar-width,270px)]"
          )}
          style={{
            marginLeft: isMobile ? 0 : "var(--sidebar-width, 270px)",
          }}
        >
          <Navbar
            onMenuClick={() => setSidebarOpen(true)}
            title={title}
          />

          <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border py-4 px-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <p>&copy; {new Date().getFullYear()} SKORA HRMS. All rights reserved.</p>
              <p>Enterprise Portal</p>
            </div>
          </footer>
        </div>
      </div>
    </RouteGuard>
  );
}
