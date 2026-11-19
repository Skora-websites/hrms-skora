"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Menu,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { MobilePunchSheet } from "./mobile-punch-sheet";
import { MobileMoreSheet } from "./mobile-more-sheet";

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [punchOpen, setPunchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);

  // Determine role default home route
  const role = user?.role || "employee";
  const homeHref =
    role === "super_admin"
      ? "/hrms/superadmin"
      : role === "hr_admin" || role === "admin"
      ? "/hrms/hr-admin"
      : role === "manager"
      ? "/hrms/manager"
      : "/hrms/employee";

  const attendanceHref =
    role === "hr_admin" || role === "super_admin"
      ? "/hrms/hr-admin/attendance"
      : "/hrms/attendance";

  const leavesHref = "/hrms/leaves";

  // Check today's punch state for the center FAB glow indicator
  const checkPunchState = async () => {
    if (!user?.id) return;
    try {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const res = await fetch(
        `/api/hrm/v2/attendance?userId=${encodeURIComponent(user.id)}&date=${encodeURIComponent(today)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        const todayRec = rows[0];
        setIsPunchedIn(Boolean(todayRec?.punchInTime && !todayRec?.punchOutTime));
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    checkPunchState();
    const interval = setInterval(checkPunchState, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const triggerHaptic = (pattern: number | number[] = 10) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  const navItems = [
    {
      label: "Home",
      icon: LayoutDashboard,
      href: homeHref,
      isActive:
        pathname === homeHref ||
        pathname === "/hrms" ||
        pathname === "/hrms/dashboard",
    },
    {
      label: "Attendance",
      icon: CalendarCheck,
      href: attendanceHref,
      isActive: pathname.startsWith("/hrms/attendance") || pathname.includes("/attendance"),
    },
    // Center Action is handled specifically
    {
      label: "Leaves",
      icon: CalendarDays,
      href: leavesHref,
      isActive: pathname.startsWith("/hrms/leaves") || pathname.includes("/leaves"),
    },
    {
      label: "More",
      icon: Menu,
      action: () => {
        triggerHaptic(12);
        setMoreOpen(true);
      },
      isActive: moreOpen,
    },
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-card/95 backdrop-blur-2xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-2 pt-1 pb-[max(env(safe-area-inset-bottom),10px)]"
      >
        <div className="flex items-center justify-between relative max-w-lg mx-auto">
          {/* First 2 Items (Home, Attendance) */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <button
                key={item.label}
                onClick={() => {
                  triggerHaptic(8);
                  if (item.href) router.push(item.href);
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-xl active:scale-95",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-normal"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
              </button>
            );
          })}

          {/* Center Elevated Punch FAB */}
          <div className="relative flex-1 flex flex-col items-center justify-center -top-4">
            <button
              onClick={() => {
                triggerHaptic([15, 30, 15]);
                setPunchOpen(true);
              }}
              aria-label="Punch In / Punch Out"
              className={cn(
                "w-13 h-13 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90 border-2 border-background",
                isPunchedIn
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/25 ring-4 ring-emerald-500/20"
                  : "bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-primary/25 ring-4 ring-primary/20"
              )}
            >
              {isPunchedIn ? (
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              ) : (
                <Zap className="w-6 h-6" />
              )}
            </button>
            <span
              className={cn(
                "text-[10px] mt-1 font-bold tracking-tight",
                isPunchedIn ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
              )}
            >
              {isPunchedIn ? "On Duty" : "Punch"}
            </span>
          </div>

          {/* Last 2 Items (Leaves, More) */}
          {navItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.href) {
                    triggerHaptic(8);
                    router.push(item.href);
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-xl active:scale-95",
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-normal"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-Up Bottom Sheets */}
      <MobilePunchSheet
        open={punchOpen}
        onOpenChange={setPunchOpen}
        onRecordUpdated={checkPunchState}
      />
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
