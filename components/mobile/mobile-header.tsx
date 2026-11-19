"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  Sparkles,
  Clock,
  User,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";

interface MobileHeaderProps {
  title?: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const initials = getInitials(displayName);

  // Can we navigate back? If not on a root page
  const isRootPage =
    pathname === "/hrms" ||
    pathname === "/hrms/employee" ||
    pathname === "/hrms/manager" ||
    pathname === "/hrms/hr-admin" ||
    pathname === "/hrms/superadmin";

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`/api/hrm/v2/notifications?userId=${user.id}&limitCount=5`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
        }
        const cRes = await fetch(`/api/hrm/v2/notifications?userId=${user.id}&count=true`);
        if (cRes.ok) {
          const cData = await cRes.json();
          setUnreadCount(cData?.data?.unreadCount ?? 0);
        }
      } catch {
        // Ignore
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/hrm/v2/notifications?id=${id}`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/hrm/v2/notifications?userId=${user.id}&all=true`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  // Determine header label
  const pageLabel =
    title ||
    (pathname.includes("/attendance")
      ? "Attendance"
      : pathname.includes("/leaves")
      ? "Leaves & Time Off"
      : pathname.includes("/payroll")
      ? "Payroll & Salary"
      : pathname.includes("/expenses")
      ? "Expense Claims"
      : pathname.includes("/documents")
      ? "Documents"
      : pathname.includes("/tasks")
      ? "Tasks"
      : pathname.includes("/performance")
      ? "Performance"
      : pathname.includes("/employees")
      ? "Directory"
      : `Hi, ${firstName}`);

  return (
    <header className="sticky top-0 z-30 md:hidden bg-background/90 backdrop-blur-2xl border-b border-border/70 px-4 pt-[max(env(safe-area-inset-top),10px)] pb-2.5">
      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
        {/* Left: Back Arrow or App Monogram + Title */}
        <div className="flex items-center gap-2 overflow-hidden">
          {!isRootPage ? (
            <button
              onClick={() => router.back()}
              className="p-1 -ml-1 rounded-lg text-foreground hover:bg-muted active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          )}

          <div className="truncate">
            <h1 className="text-sm font-bold text-foreground truncate tracking-tight">
              {pageLabel}
            </h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SKORA HRMS
            </p>
          </div>
        </div>

        {/* Center/Shift Pill */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/60 border border-border/60 text-muted-foreground">
          <Clock className="w-3 h-3 text-primary" />
          <span>10 AM – 7 PM</span>
        </div>

        {/* Right: Notifications Bell & Avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 rounded-full"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between text-xs py-1.5">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  <Bell className="h-5 w-5 mx-auto mb-1 text-muted-foreground/40" />
                  No new notifications
                </div>
              ) : (
                <div className="space-y-1 p-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className="p-2 rounded-lg text-xs hover:bg-muted/60 cursor-pointer space-y-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground truncate">{n.title}</p>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Avatar */}
          <Avatar className="h-7 w-7 border border-border/80">
            {user?.image ? (
              <AvatarImage src={user.image} alt={displayName} />
            ) : (
              <AvatarFallback className="text-[10px] font-bold bg-primary text-white">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      </div>
    </header>
  );
}
