"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Building2,
  Contact2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  CalendarDays,
  DollarSign,
  Package,
  FileText,
  MessageSquare,
  ClipboardList,
  LogOut,
  Sun,
  Moon,
  Search,
  UserCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useBreakpoint } from "@/hooks/use-media-query";
import {
  NAV_ITEMS,
  NAV_ITEMS_BY_ROLE,
  NAV_GROUPS,
  NAV_GROUP_ORDER,
  EXPANDABLE_GROUPS,
  type NavGroup,
  type NavItem,
} from "@/lib/constants";
import { useAuth } from "@/components/providers/auth-provider";
import { canAccessRoute, getRoleLabel } from "@/lib/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { getInitials } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  TrendingUp,
  Building2,
  Contact2,
  BarChart3,
  Settings,
  Clock,
  CalendarDays,
  DollarSign,
  Package,
  FileText,
  MessageSquare,
  ClipboardList,
  LogOut,
  Sun,
  UserCheck,
  CheckCircle2,
};

const roleSettingsMap: Record<string, string> = {
  super_admin: "/hrms/superadmin/settings",
  hr_admin: "/hrms/hr-admin/settings",
  admin: "/hrms/hr-admin/settings",
  manager: "/hrms/manager/settings",
  employee: "/hrms/employee/settings",
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isSidebarMini, setSidebarMini, theme, toggleTheme } = useTheme();
  const { isMobile, isTablet } = useBreakpoint();
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);

  // Track which expandable groups are open/closed
  const [expandedGroups, setExpandedGroups] = useState<Set<NavGroup>>(
    () => new Set<NavGroup>(["hrm"])
  );

  // Load persisted expanded state from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-expanded-groups");
      if (stored) {
        const parsed: NavGroup[] = JSON.parse(stored);
        setExpandedGroups(new Set(parsed));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleGroup = (group: NavGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      // Persist to localStorage
      try {
        localStorage.setItem(
          "sidebar-expanded-groups",
          JSON.stringify([...next])
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isCollapsed = isSidebarMini && !isMobile && !isTablet;

  const roleNavItems = (user?.role && NAV_ITEMS_BY_ROLE[user.role]) || NAV_ITEMS;
  // Filter nav items based on the user's role
  const visibleNavItems = roleNavItems.filter((item) =>
    canAccessRoute(user?.role ?? null, item.href)
  );

  // Group visible items by their group field, preserving order
  const groupedItems: { group: NavGroup; items: NavItem[] }[] = [];
  const seenGroups = new Set<NavGroup>();

  for (const item of visibleNavItems) {
    if (!seenGroups.has(item.group)) {
      seenGroups.add(item.group);
      groupedItems.push({ group: item.group, items: [item] });
    } else {
      const existingGroup = groupedItems.find((g) => g.group === item.group);
      if (existingGroup) {
        existingGroup.items.push(item);
      }
    }
  }

  // Re-sort groups to match NAV_GROUP_ORDER
  groupedItems.sort(
    (a, b) => NAV_GROUP_ORDER.indexOf(a.group) - NAV_GROUP_ORDER.indexOf(b.group)
  );

  const displayName = user?.name || user?.email || "User";
  const initials = getInitials(displayName);
  const roleLabel = getRoleLabel(user?.role ?? "");

  // ── Render a single nav link ──────────────────────────────────
  const renderNavLink = (item: NavItem) => {
    const Icon = iconMap[item.icon];
    const isActive =
      pathname === item.href || pathname.startsWith(item.href + "/");

    const linkContent = (
      <Link
        href={item.href}
        onClick={() => isMobile && onClose()}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg transition-all duration-200",
          isCollapsed ? "justify-center mx-auto w-10 h-10" : "px-3 py-2.5",
          "text-sm font-medium",
          isActive
            ? "text-primary"
            : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
        )}
      >
        {/* Active indicator bar - gradient accent */}
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary/80 to-primary/30 shadow-sm shadow-primary/20" />
        )}
        {isActive && isCollapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary/80 to-primary/30 shadow-sm shadow-primary/20" />
        )}

        {/* Active background glow */}
        {isActive && (
          <span className="absolute inset-0 rounded-lg bg-primary/[0.07] dark:bg-primary/[0.12]" />
        )}

        {/* Icon */}
        <span
          className={cn(
            "relative z-10 flex items-center justify-center transition-all duration-200",
            isCollapsed ? "h-[18px] w-[18px]" : "h-[18px] w-[18px] shrink-0"
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              isActive
                ? "text-primary drop-shadow-sm"
                : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground group-hover:scale-105"
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </span>

        {/* Label */}
        {!isCollapsed && (
          <span
            className={cn(
              "relative z-10 truncate transition-all duration-200",
              isActive && "font-semibold"
            )}
          >
            {item.title}
          </span>
        )}
      </Link>
    );

    // Wrap with tooltip when collapsed
    if (isCollapsed) {
      return (
        <Tooltip key={`${item.title}-${item.href}`}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={16}
            className="z-60 border border-white/10 bg-[#0b1120]/95 backdrop-blur-xl text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {item.title}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={`${item.title}-${item.href}`}>{linkContent}</div>;
  };

  // ── Render a group section ────────────────────────────────────
  const renderGroup = (group: NavGroup, items: NavItem[]) => {
    const label = NAV_GROUPS[group];
    const isExpandable = EXPANDABLE_GROUPS.includes(group);
    const isExpanded = expandedGroups.has(group);

    if (isCollapsed) {
      // In collapsed mode, render items directly regardless of expand state
      return <li key={group}>{items.map(renderNavLink)}</li>;
    }

    return (
      <li key={group} className="space-y-0.5">
        <div className="flex items-center px-3 pt-5 pb-1.5">
          {isExpandable ? (
            <button
              onClick={() => toggleGroup(group)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-1.5 py-1 -ml-1.5 transition-all duration-200 w-full text-left",
                "hover:bg-sidebar-accent/60 group/expander"
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-sidebar-foreground/40 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90"
                )}
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                {label}
              </span>
              <div
                className={cn(
                  "ml-auto h-px flex-1 transition-all duration-200",
                  "bg-sidebar-border/50"
                )}
              />
            </button>
          ) : (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/40">
                {label}
              </span>
              <div className="ml-3 flex-1 h-px bg-sidebar-border/50" />
            </>
          )}
        </div>

        {isExpandable ? (
          <div
            className={cn(
              "overflow-hidden transition-[max-height] duration-300 ease-in-out",
              isExpanded ? "max-h-[500px]" : "max-h-0"
            )}
          >
            <div className="space-y-0.5 pt-0.5">
              {items.map(renderNavLink)}
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map(renderNavLink)}
          </div>
        )}
      </li>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Mobile overlay */}
      {isMobile && open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col",
          "bg-sidebar dark:bg-sidebar",
          "border-r border-sidebar-border",
          "transition-[width,margin,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          // Light mode shadow
          "shadow-sm shadow-sidebar-border/50",
          // Dark mode subtle glow
          "dark:shadow-none dark:border-white/[0.06]",
          isMobile
            ? cn("w-[270px]", open ? "translate-x-0" : "-translate-x-full")
            : "",
          !isMobile && "translate-x-0"
        )}
        style={{
          width: isMobile ? "270px" : "var(--sidebar-width, 270px)",
        }}
      >
        {/* ── Logo Area ──────────────────────────────────────── */}
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-sidebar-border",
            isCollapsed ? "h-16 justify-center" : "h-16 px-4"
          )}
        >
          <Link
            href="/hrms"
            className={cn(
              "flex items-center gap-3 group",
              isCollapsed && "justify-center"
            )}
          >
            {/* Logo icon with subtle glow */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-primary/30">
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-xl bg-white/10" />
              <span className="relative z-10 text-sm font-bold text-white">
                H
              </span>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground dark:text-white leading-tight">
                    HRMS
                    <span className="text-primary font-light">.pro</span>
                  </span>
                  <Sparkles className="h-3 w-3 text-primary/60" />
                </div>
                <span className="text-[10px] font-medium text-sidebar-foreground/40 tracking-[0.12em] uppercase leading-tight">
                  HR Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* ── Search Bar ─────────────────────────────────────── */}
        {!isCollapsed && (
          <div className="shrink-0 px-3 pt-3.5 pb-2">
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200",
                searchFocused
                  ? "border-primary/40 bg-primary/[0.04] dark:bg-primary/[0.06] shadow-sm shadow-primary/5"
                  : "border-sidebar-border/60 bg-sidebar-accent/40 dark:bg-sidebar-accent/50 hover:border-sidebar-border hover:bg-sidebar-accent/60"
              )}
            >
              <Search
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors duration-200",
                  searchFocused
                    ? "text-primary"
                    : "text-sidebar-foreground/40"
                )}
              />
              <input
                placeholder="Quick search..."
                className="flex-1 bg-transparent text-xs text-sidebar-accent-foreground placeholder:text-sidebar-foreground/30 outline-none border-none"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="inline-flex h-5 items-center gap-0.5 rounded-md border border-sidebar-border/50 bg-sidebar-accent/60 px-1.5 text-[10px] font-medium text-sidebar-foreground/40">
                <span>⌘</span>K
              </kbd>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center shrink-0 pt-3.5 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border/40 text-sidebar-foreground/40 hover:text-sidebar-accent-foreground hover:border-sidebar-border hover:bg-sidebar-accent/50 transition-all duration-200 cursor-pointer">
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5 scrollbar-thin">
          <ul className="space-y-0.5">
            {groupedItems.map(({ group, items }) => renderGroup(group, items))}
          </ul>
        </nav>

        {/* ── Bottom Section ─────────────────────────────────── */}
        <div className="shrink-0 border-t border-sidebar-border/80">
          {/* Quick actions row */}
          {!isCollapsed && (
            <div className="px-2 pt-2 pb-1">
              <div className="flex items-center gap-1 rounded-xl bg-sidebar-accent/30 dark:bg-sidebar-accent/40 p-1">
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200",
                    theme === "light"
                      ? "bg-white dark:bg-sidebar-accent/80 text-amber-500 shadow-sm"
                      : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light</span>
                </button>
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200",
                    theme === "dark"
                      ? "bg-sidebar-accent/80 text-indigo-400 shadow-sm dark:bg-sidebar"
                      : "text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          )}

          {/* User profile */}
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-2.5",
              isCollapsed && "justify-center"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={roleSettingsMap[user?.role || "employee"] || "/hrms/employee/settings"}
                  className={cn(
                    "flex items-center gap-3 rounded-xl transition-all duration-200 hover:bg-sidebar-accent/60 px-2.5 py-2 flex-1 min-w-0 group/user",
                    isCollapsed && "px-0 py-0 justify-center"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 ring-2 ring-sidebar-border/60 ring-offset-2 ring-offset-sidebar transition-all duration-200 group-hover/user:ring-primary/40">
                      {user?.image ? (
                        <AvatarImage src={user.image} alt={displayName} />
                      ) : (
                        <AvatarFallback className="text-[11px] font-bold bg-gradient-to-br from-primary to-primary/70 text-white">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {/* Online indicator */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success shadow-sm" />
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold text-sidebar-accent-foreground dark:text-white truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[11px] text-sidebar-foreground/50 truncate capitalize leading-tight">
                        {roleLabel}
                      </span>
                    </div>
                  )}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  sideOffset={16}
                  className="z-60 border border-white/10 bg-[#0b1120]/95 backdrop-blur-xl text-white shadow-xl rounded-xl px-3 py-2"
                >
                  <p className="font-semibold text-sm">{displayName}</p>
                  <p className="text-muted-foreground text-[11px] capitalize mt-0.5">
                    {roleLabel}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>

            {!isCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/auth/session", {
                          method: "DELETE",
                        });
                        if (res.ok) window.location.href = "/hrms/login";
                      } catch {
                        window.location.href = "/hrms/login";
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/40 hover:text-danger hover:bg-danger/10 transition-all duration-200 shrink-0"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Sign Out
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Collapse toggle (desktop only) */}
          {!isMobile && !isTablet && (
            <div className="border-t border-sidebar-border/60 px-2 py-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSidebarMini(!isSidebarMini)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-all duration-200 w-full",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <ChevronLeft
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        isCollapsed && "rotate-180"
                      )}
                    />
                    {!isCollapsed && <span>Collapse</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
