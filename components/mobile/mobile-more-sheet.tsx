"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Settings,
  LogOut,
  Receipt,
  FileText,
  DollarSign,
  Package,
  CalendarDays,
  Clock,
  Sparkles,
  Users,
  Building2,
  ListTodo,
  Sun,
  Moon,
  DownloadCloud,
  ChevronRight,
  Shield,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useTheme } from "@/hooks/use-theme";
import { getInitials } from "@/lib/utils";

interface MobileMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMoreSheet({ open, onOpenChange }: MobileMoreSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = user?.name || user?.email?.split("@")[0] || "Employee";
  const initials = getInitials(displayName);
  const role = user?.role || "employee";

  // Role-based profile and settings
  const profileHref =
    role === "super_admin"
      ? "/hrms/superadmin/profile"
      : role === "hr_admin" || role === "admin"
      ? "/hrms/hr-admin/profile"
      : role === "manager"
      ? "/hrms/manager/profile"
      : "/hrms/employee/profile";

  const settingsHref =
    role === "super_admin"
      ? "/hrms/superadmin/settings"
      : role === "hr_admin" || role === "admin"
      ? "/hrms/hr-admin/settings"
      : role === "manager"
      ? "/hrms/manager/settings"
      : "/hrms/employee/settings";

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // Ignore
    } finally {
      window.location.href = "/hrms/login";
    }
  };

  const menuGroups = [
    {
      title: "Work & Pay",
      items: [
        {
          label: "Payslips & Salary",
          href: "/hrms/employee/payslips",
          icon: DollarSign,
          badge: null,
        },
        {
          label: "Expense Claims",
          href:
            role === "hr_admin" || role === "super_admin"
              ? "/hrms/hr-admin/expenses"
              : "/hrms/employee/expenses",
          icon: Receipt,
          badge: null,
        },
        {
          label: "Leaves & Time Off",
          href: "/hrms/leaves",
          icon: CalendarDays,
          badge: null,
        },
        {
          label: "Holidays Calendar",
          href: "/hrms/holidays",
          icon: Sun,
          badge: null,
        },
        {
          label: "Overtime & Comp-Off",
          href:
            role === "hr_admin" || role === "super_admin"
              ? "/hrms/hr-admin/attendance/overtime"
              : "/hrms/attendance/overtime",
          icon: Clock,
          badge: null,
        },
      ],
    },
    {
      title: "Team & People",
      items: [
        {
          label: role === "manager" ? "My Team" : "Employee Directory",
          href:
            role === "manager"
              ? "/hrms/manager/my-team"
              : role === "hr_admin" || role === "super_admin"
              ? "/hrms/hr-admin/employees"
              : "/hrms/employees",
          icon: Users,
          badge: null,
        },
        {
          label: "Org Structure",
          href: "/hrms/organization",
          icon: Building2,
          badge: null,
        },
        {
          label: "Kudos Recognition Wall",
          href: "/hrms/engage/kudos",
          icon: Sparkles,
          badge: "Points",
        },
        {
          label: "Performance Reviews",
          href:
            role === "employee"
              ? "/hrms/employee/performance"
              : "/hrms/performance",
          icon: TrendingUp,
          badge: null,
        },
      ],
    },
    {
      title: "Company Assets & Documents",
      items: [
        {
          label: "My Documents & Letters",
          href: "/hrms/documents/my",
          icon: FileText,
          badge: "Signed",
        },
        {
          label: "Assigned Assets",
          href:
            role === "employee"
              ? "/hrms/employee/assets"
              : "/hrms/assets",
          icon: Package,
          badge: null,
        },
        {
          label: "Tasks & Workflow",
          href: "/hrms/tasks",
          icon: ListTodo,
          badge: null,
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className="bottom-0 top-auto translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0 border-t border-border/80 p-0 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.2)] bg-card/95 backdrop-blur-2xl"
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 mx-auto" />
        </div>

        {/* Scrollable Container with Safe-Area Inset Bottom */}
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)] space-y-5">
          {/* User Hero Header Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={displayName} />
                ) : (
                  <AvatarFallback className="text-sm font-bold bg-primary text-white">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground leading-tight">
                    {displayName}
                  </h3>
                  <Badge variant="outline" className="text-[10px] capitalize py-0 px-1.5">
                    {role.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {user?.email}
                </p>
                {user?.employeeCode && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    ID: {user.employeeCode}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-xl"
              onClick={() => handleNavigate(profileHref)}
            >
              Profile
            </Button>
          </div>

          {/* Quick Preference Switchers */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-primary" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <span className="font-medium">
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground capitalize">
                {theme}
              </span>
            </button>

            <button
              onClick={() => handleNavigate(settingsHref)}
              className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <span className="font-medium">Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Grouped Links */}
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {group.title}
              </h4>
              <div className="rounded-2xl border border-border/60 bg-muted/20 overflow-hidden divide-y divide-border/40">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-muted/50 active:bg-muted/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-background border border-border/60 flex items-center justify-center text-primary shadow-xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Sign Out Action */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-11 text-xs font-semibold rounded-2xl text-danger hover:bg-danger/10 hover:text-danger border-danger/30"
              disabled={loggingOut}
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loggingOut ? "Signing Out..." : "Sign Out of Skora HRMS"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
