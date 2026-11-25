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
  Check,
  CheckCircle2,
  X,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [testSent, setTestSent] = useState(false);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const firstName = displayName.split(" ")[0];
  const initials = getInitials(displayName);

  // Check Web Notification permission state
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    } else {
      setPushPermission("unsupported");
    }
  }, []);

  // Root pages where back chevron is not needed
  const isRootPage =
    pathname === "/hrms" ||
    pathname === "/hrms/employee" ||
    pathname === "/hrms/manager" ||
    pathname === "/hrms/hr-admin" ||
    pathname === "/hrms/superadmin";

  const fetchNotifs = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/hrm/v2/notifications?userId=${user.id}&limitCount=20`);
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

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 45000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/hrm/v2/notifications?id=${id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await fetch(`/api/hrm/v2/notifications?userId=${user.id}&all=true`, { method: "PATCH", body: JSON.stringify({ all: true }) });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  // Request browser Notification permission for device push alerts
  const handleRequestPushPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported on this browser.");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === "granted") {
        sendDeviceNotification("Notifications Active", "You will now receive real-time HRMS alerts on this device.");
      }
    } catch (e) {
      console.warn("Failed to request notification permission:", e);
    }
  };

  const sendDeviceNotification = async (notifTitle: string, notifBody: string) => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;

    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(notifTitle, {
          body: notifBody,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          vibrate: [200, 100, 200],
          tag: "skora-hrms-test",
        } as any);
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
        return;
      } catch {}
    }

    // Direct fallback
    try {
      new Notification(notifTitle, {
        body: notifBody,
        icon: "/icons/icon-192.png",
      });
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
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
      : pathname.includes("/tests")
      ? "Assessments"
      : pathname.includes("/tickets")
      ? "Tickets & Helpdesk"
      : pathname.includes("/performance")
      ? "Performance"
      : pathname.includes("/employees")
      ? "Directory"
      : `Hi, ${firstName}`);

  return (
    <>
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

            <div className="min-w-0 flex-1 truncate">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight leading-tight">
                {pageLabel}
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium leading-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">SKORA HRMS</span>
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
            {/* Native Mobile Notification Sheet Trigger */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setNotifSheetOpen(true);
                fetchNotifs();
              }}
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

      {/* ── Native Mobile Notification Sheet ────────────────────── */}
      <Dialog open={notifSheetOpen} onOpenChange={setNotifSheetOpen}>
        <DialogContent
          size="md"
          className="bottom-0 top-auto translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0 border-t border-border/80 p-0 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.2)] bg-card/95 backdrop-blur-2xl"
        >
          {/* Grab Handle */}
          <div className="pt-3 pb-1 shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 mx-auto" />
          </div>

          {/* Sheet Header */}
          <div className="px-5 pb-3 border-b border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Scrollable Notifications Feed */}
          <div className="overflow-y-auto px-5 py-4 space-y-3.5 pb-[max(env(safe-area-inset-bottom),24px)]">
            {/* Device Push Notification Alert / Toggle Banner */}
            {pushPermission !== "granted" && pushPermission !== "unsupported" ? (
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5" />
                    Turn on Mobile Notifications
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Receive live alerts on your phone screen when leaves or tasks update.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRequestPushPermission}
                  className="h-7 text-xs font-semibold shrink-0"
                >
                  Enable
                </Button>
              </div>
            ) : pushPermission === "granted" ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Mobile notifications active on this device
                </span>
                <button
                  onClick={() =>
                    sendDeviceNotification(
                      "HRMS Notification Test",
                      "Mobile push notifications are working perfectly on your device!"
                    )
                  }
                  className="underline text-[10px] font-bold text-primary hover:opacity-80"
                >
                  {testSent ? "Sent!" : "Send test alert"}
                </button>
              </div>
            ) : null}

            {/* List */}
            {notifications.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  You have no new notifications. Activity updates will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id)}
                    className={`p-3.5 rounded-2xl border text-xs transition-colors space-y-1 cursor-pointer active:scale-[0.99] ${
                      !n.isRead
                        ? "bg-card border-primary/30 shadow-2xs"
                        : "bg-muted/20 border-border/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-bold truncate text-xs ${
                          !n.isRead ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {n.body}
                    </p>
                    {n.createdAt && (
                      <p className="text-[10px] font-mono text-muted-foreground/80 pt-0.5">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
