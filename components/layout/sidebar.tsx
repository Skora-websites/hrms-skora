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
  ListTodo,
  LogOut,
  Sun,
  Search,
  UserCheck,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  Receipt,
  CreditCard,
  Zap,
  GraduationCap,
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
import { canAccessRoute } from "@/lib/rbac";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

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
  ListTodo,
  LogOut,
  Sun,
  UserCheck,
  CheckCircle2,
  FolderOpen,
  Receipt,
  CreditCard,
  Sparkles,
  Zap,
  GraduationCap,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isSidebarMini, setSidebarMini } = useTheme();
  const { isMobile, isTablet } = useBreakpoint();
  const { user } = useAuth();
  const [searchFocused, setSearchFocused] = useState(false);
  const [navSearch, setNavSearch] = useState("");

  // Track which expandable groups are open/closed (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<NavGroup>>(
    () => new Set<NavGroup>(["overview", "hrm", "operations", "lifecycle", "crm", "system"])
  );

  // Load persisted expanded state from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-expanded-groups");
      if (stored) {
        const parsed: NavGroup[] = JSON.parse(stored);
        setExpandedGroups((prev) => new Set([...prev, ...parsed]));
      }
    } catch {
      // ignore
    }
  }, []);

  // Ensure active route group is always expanded and visible
  useEffect(() => {
    if (!pathname) return;
    for (const item of NAV_ITEMS) {
      if (pathname === item.href || pathname.startsWith(item.href + "/")) {
        setExpandedGroups((prev) => new Set([...prev, item.group]));
      }
    }
  }, [pathname]);

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
  // Filter nav items based on the user's role, then by the quick-search term
  // (case-insensitive substring match on the item title).
  const visibleNavItems = roleNavItems.filter((item) =>
    canAccessRoute(user?.role ?? null, item.href)
  ).filter((item) =>
    navSearch.trim() === "" ||
    item.title.toLowerCase().includes(navSearch.trim().toLowerCase())
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
          "group relative flex items-center gap-3 rounded-xl transition-colors duration-150",
          isCollapsed ? "justify-center mx-auto w-10 h-10" : "px-3 py-2",
          "text-xs font-medium",
          isActive
            ? "text-primary font-semibold"
            : "text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
        )}
      >
        {/* Active indicator bar - gradient accent */}
        {isActive && !isCollapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}
        {isActive && isCollapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
        )}

        {/* Active background glow */}
        {isActive && (
          <span className="absolute inset-0 rounded-xl bg-primary/[0.08] dark:bg-primary/[0.15] border border-primary/20" />
        )}

        {/* Icon */}
        <span
          className={cn(
            "relative z-10 flex items-center justify-center transition-transform duration-150",
            isCollapsed ? "h-[18px] w-[18px]" : "h-[18px] w-[18px] shrink-0"
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px] transition-colors duration-150",
              isActive
                ? "text-primary"
                : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground group-hover:scale-105"
            )}
            strokeWidth={isActive ? 2.5 : 2}
          />
        </span>

        {/* Label */}
        {!isCollapsed && (
          <span
            className={cn(
              "relative z-10 truncate transition-colors duration-150",
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
            className="z-60 border border-border bg-popover text-popover-foreground text-xs font-medium px-3 py-1.5 rounded-lg shadow-md"
          >
            <div>{item.title}</div>
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
                "flex items-center gap-2 rounded-lg px-1.5 py-1 -ml-1.5 transition-colors duration-150 w-full text-left",
                "hover:bg-sidebar-accent/60 group/expander"
              )}
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-sidebar-foreground/70 transition-transform duration-200",
                  isExpanded ? "rotate-0" : "-rotate-90"
                )}
              />
              <span className="text-xs font-semibold text-sidebar-foreground/80">
                {label}
              </span>
              <div
                className={cn(
                  "ml-auto h-px flex-1 transition-opacity duration-150",
                  "bg-sidebar-border/50"
                )}
              />
            </button>
          ) : (
            <>
              <span className="text-xs font-semibold text-sidebar-foreground/80">
                {label}
              </span>
              <div className="ml-3 flex-1 h-px bg-sidebar-border/50" />
            </>
          )}
        </div>

        {isExpandable ? (
          <div
            className={cn(
              "overflow-hidden transition-opacity duration-200 ease-in-out motion-reduce:transition-none",
              isExpanded ? "opacity-100 max-h-[500px]" : "opacity-0 max-h-0 pointer-events-none"
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm motion-safe:animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col",
          "bg-sidebar dark:bg-sidebar",
          "border-r border-sidebar-border",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          "dark:border-white/[0.06]",
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
            {/* Logo icon */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary transition-transform duration-200 group-hover:scale-105">
              <span className="relative z-10 text-sm font-bold text-white">
                S
              </span>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-sidebar-accent-foreground dark:text-white leading-tight">
                    SKORA <span className="text-primary font-light">HRMS</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground leading-tight">
                  Enterprise Portal
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
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors duration-150",
                searchFocused
                  ? "border-primary/40 bg-primary/[0.04] dark:bg-primary/[0.06]"
                  : "border-sidebar-border/60 bg-sidebar-accent/40 dark:bg-sidebar-accent/50 hover:border-sidebar-border hover:bg-sidebar-accent/60"
              )}
            >
              <Search
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors duration-150",
                  searchFocused
                    ? "text-primary"
                    : "text-sidebar-foreground/70"
                )}
              />
              <input
                placeholder="Quick search..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs text-sidebar-accent-foreground placeholder:text-sidebar-foreground/70 outline-none border-none"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd className="inline-flex h-5 items-center gap-0.5 rounded-md border border-sidebar-border/50 bg-sidebar-accent/60 px-1.5 text-xs font-medium text-sidebar-foreground/70">
                <span>⌘</span>K
              </kbd>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="flex justify-center shrink-0 pt-3.5 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border/40 text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:border-sidebar-border hover:bg-sidebar-accent/50 transition-colors duration-150 cursor-pointer">
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

        {/* ── Bottom Section (Collapse toggle - desktop only) ── */}
        {!isMobile && !isTablet && (
          <div className="shrink-0 border-t border-sidebar-border/80 px-2 py-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarMini(!isSidebarMini)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 transition-colors duration-150 w-full",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <ChevronLeft
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
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
      </aside>
    </TooltipProvider>
  );
}
