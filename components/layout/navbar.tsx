"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Loader2,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useBreakpoint } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";


// ── Role-based path maps ────────────────────────────────
const ROLE_PROFILE: Record<string, string> = {
  super_admin: "/hrms/superadmin/profile",
  hr_admin: "/hrms/hr-admin/profile",
  admin: "/hrms/hr-admin/profile",
  manager: "/hrms/manager/profile",
  employee: "/hrms/employee/profile",
};
const ROLE_SETTINGS: Record<string, string> = {
  super_admin: "/hrms/superadmin/settings",
  hr_admin: "/hrms/hr-admin/settings",
  admin: "/hrms/hr-admin/settings",
  manager: "/hrms/manager/settings",
  employee: "/hrms/employee/settings",
};
const ROLE_TASKS: Record<string, string> = {
  super_admin: "/hrms/superadmin",
  hr_admin: "/hrms/hr-admin/projects",
  manager: "/hrms/manager/projects",
  employee: "/hrms/employee/my-tasks",
};

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Navbar({ onMenuClick, title }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<{
    id: string;
    title: string;
    body: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    referenceId?: string;
    referenceType?: string;
  }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifs = async () => {
      setNotifLoading(true);
      try {
        const res = await fetch(`/api/hrm/v2/notifications?userId=${user.id}&limitCount=5`);
        if (res.ok) {
          const data = await res.json();
          const items = data.data || [];
          setNotifications(items.slice(0, 5));
          setUnreadCount(items.filter((n: any) => !n.isRead).length);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setNotifLoading(false);
      }
    };
    fetchNotifs();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await fetch(`/api/hrm/v2/notifications?id=${notifId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`/api/hrm/v2/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task": return ClipboardList;
      case "ticket": return MessageSquare;
      default: return Bell;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Generate breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    href: "/" + segments.slice(0, index + 1).join("/"),
  }));

  const displayName = user?.name || user?.email || "User";
  const initials = getInitials(displayName);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 navbar-glass",
        "flex h-16 items-center gap-4 px-4 lg:px-6"
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <div className="hidden sm:flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-muted/50">/</span>
            )}
            <span
              className={cn(
                index === breadcrumbs.length - 1
                  ? "text-muted font-semibold"
                  : "text-muted/60 hover:text-muted transition-colors"
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Title for mobile */}
      {isMobile && title && (
        <h6 className="text-dark dark:text-white font-semibold truncate">
          {title}
        </h6>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      {!isMobile && (
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 h-9 text-sm bg-gray-50 dark:bg-gray-800/50 border-0 focus:w-80 transition-all duration-300"
          />
        </div>
      )}

      {/* Mobile search toggle */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
          className="md:hidden"
        >
          <Search className="h-5 w-5" />
        </Button>
      )}

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="danger"
                size="sm"
                className="absolute -right-1 -top-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-xxs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted/30" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {notifications.map((notif) => {
                const NotifIcon = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) handleMarkAsRead(notif.id);
                      if (notif.referenceType === "task" && notif.referenceId) {
                        router.push(`/hrms/tasks?id=${notif.referenceId}`);
                      } else if (notif.referenceType === "ticket" && notif.referenceId) {
                        router.push(`/hrms/tickets?id=${notif.referenceId}`);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 rounded-lg p-2 cursor-pointer transition-colors",
                      !notif.isRead
                        ? "bg-primary/[0.04] dark:bg-primary/[0.08]"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      notif.type === "task" ? "bg-info/10" :
                      notif.type === "ticket" ? "bg-primary/10" :
                      "bg-muted/30"
                    )}>
                      <NotifIcon className={cn(
                        "h-4 w-4",
                        notif.type === "task" ? "text-info" :
                        notif.type === "ticket" ? "text-primary" :
                        "text-muted"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm truncate",
                          !notif.isRead ? "font-semibold text-dark dark:text-white" : "text-dark dark:text-white"
                        )}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted truncate mt-0.5">{notif.body}</p>
                      <p className="text-xxs text-muted/60 mt-0.5">
                        {getTimeAgo(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 h-9"
          >
            <Avatar className="h-8 w-8">
              {user?.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : (
                <AvatarFallback className="text-xs font-bold bg-gradient-primary text-white">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            {!isMobile && (
              <>
                <div className="text-left">
                  <p className="text-sm font-semibold text-dark dark:text-white leading-tight">
                    {displayName}
                  </p>
                  <p className="text-xxs text-muted capitalize">{user?.role || "User"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(ROLE_PROFILE[user?.role || "employee"] || "/hrms/employee")}>
            <User className="mr-2 h-4 w-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(ROLE_SETTINGS[user?.role || "employee"] || "/hrms/employee/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(ROLE_TASKS[user?.role || "employee"] || "/hrms/employee/my-tasks")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            My Tasks
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-danger"
            onClick={async () => {
              try {
                const res = await fetch("/api/auth/session", { method: "DELETE" });
                if (res.ok) {
                  window.location.href = "/hrms/login";
                }
              } catch {
                window.location.href = "/hrms/login";
              }
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
