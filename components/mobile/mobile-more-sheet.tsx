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
  GraduationCap,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  Zap,
  BarChart3,
  UserCheck,
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

  const isStaff =
    role === "super_admin" ||
    role === "hr_admin" ||
    role === "admin" ||
    role === "manager";

  const isHRorSuperAdmin =
    role === "super_admin" || role === "hr_admin" || role === "admin";

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
      title: "Work & Compensation",
      items: [
        {
          label: "Payslips & Salary",
          href: "/hrms/employee/payslips",
          icon: DollarSign,
          badge: null,
        },
        {
          label: "Salary Advance",
          href: "/hrms/employee/salary-advance",
          icon: CreditCard,
          badge: "Instant",
        },
        {
          label: "Expense Claims",
          href: isHRorSuperAdmin
            ? "/hrms/hr-admin/expenses"
            : role === "manager"
            ? "/hrms/manager/expenses"
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
          label: "Timesheets",
          href: role === "manager" ? "/hrms/manager/timesheets" : "/hrms/employee/timesheet",
          icon: Clock,
          badge: null,
        },
        {
          label: "Overtime & Comp-Off",
          href: isHRorSuperAdmin
            ? "/hrms/hr-admin/attendance/overtime"
            : "/hrms/attendance/overtime",
          icon: Clock,
          badge: null,
        },
        {
          label: "Holidays Calendar",
          href: "/hrms/holidays",
          icon: Sun,
          badge: null,
        },
      ],
    },
    {
      title: "Skills, Tasks & Helpdesk",
      items: [
        {
          label: "Skill Assessments & Tests",
          href: "/hrms/tests",
          icon: GraduationCap,
          badge: "Tests",
        },
        {
          label: "Support Tickets & Helpdesk",
          href: "/hrms/tickets",
          icon: MessageSquare,
          badge: "Support",
        },
        {
          label: "My Tasks & Projects",
          href: "/hrms/tasks",
          icon: ListTodo,
          badge: null,
        },
        {
          label: "Performance & Goals",
          href: role === "employee" ? "/hrms/employee/performance" : "/hrms/performance",
          icon: TrendingUp,
          badge: null,
        },
        {
          label: "Company Documents & Letters",
          href: "/hrms/documents/my",
          icon: FileText,
          badge: "Signed",
        },
        {
          label: "Assigned Assets",
          href: role === "employee" ? "/hrms/employee/assets" : "/hrms/assets",
          icon: Package,
          badge: null,
        },
      ],
    },
    {
      title: "Team & Engagement",
      items: [
        {
          label: role === "manager" ? "My Team Overview" : "Employee Directory",
          href:
            role === "manager"
              ? "/hrms/manager/my-team"
              : isHRorSuperAdmin
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
      ],
    },
    ...(isStaff
      ? [
          {
            title: "Management & Admin Controls",
            items: [
              ...(role === "manager" || isHRorSuperAdmin
                ? [
                    {
                      label: "Manager Approvals Hub",
                      href: "/hrms/manager/approvals",
                      icon: CheckCircle2,
                      badge: "Action",
                    },
                  ]
                : []),
              ...(isHRorSuperAdmin
                ? [
                    {
                      label: "Recruitment & Candidates",
                      href: "/hrms/recruitment",
                      icon: UserCheck,
                      badge: "Hiring",
                    },
                    {
                      label: "Payroll Master & Disbursal",
                      href: "/hrms/hr-admin/payroll",
                      icon: DollarSign,
                      badge: null,
                    },
                    {
                      label: "Leave Policies Configuration",
                      href: "/hrms/hr-admin/leave-policies",
                      icon: CalendarDays,
                      badge: null,
                    },
                  ]
                : []),
              {
                label: "Automated Workflows",
                href: "/hrms/workflow",
                icon: Zap,
                badge: "Auto",
              },
              {
                label: "Reports & Intelligence",
                href: "/hrms/reports",
                icon: BarChart3,
                badge: null,
              },
              ...(role === "super_admin"
                ? [
                    {
                      label: "System Audit Logs",
                      href: "/hrms/superadmin/audit-logs",
                      icon: Shield,
                      badge: "Security",
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        className="bottom-0 top-auto translate-y-0 rounded-t-3xl rounded-b-none border-x-0 border-b-0 border-t border-border/80 p-0 max-w-lg w-full max-h-[88vh] overflow-hidden flex flex-col shadow-[0_-12px_40px_rgba(0,0,0,0.2)] bg-card/95 backdrop-blur-2xl"
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25 mx-auto" />
        </div>

        {/* Scrollable Container with Safe-Area Inset Bottom */}
        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),28px)] space-y-5">
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

          {/* Nav Categories */}
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
                {group.title}
              </h4>
              <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/50">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quick Actions (Theme & Settings & Logout) */}
          <div className="space-y-1.5 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
              Preferences
            </h4>
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden divide-y divide-border/50">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-foreground">
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-indigo-500" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {theme}
                </Badge>
              </button>

              <button
                onClick={() => handleNavigate(settingsHref)}
                className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-foreground">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Account Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
              </button>

              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full flex items-center justify-between p-3.5 hover:bg-danger/10 text-danger transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">
                    {loggingOut ? "Signing Out..." : "Sign Out"}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
