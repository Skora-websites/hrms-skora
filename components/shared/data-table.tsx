"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────

export interface Column<T> {
  key?: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface Action<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  variant?: "default" | "primary" | "success" | "info" | "warning" | "danger" | "ghost";
  disabled?: boolean | ((item: T) => boolean);
  hidden?: boolean | ((item: T) => boolean);
}

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data array */
  data: T[];
  /** Unique key field (defaults to "id") */
  rowKey?: keyof T | ((item: T) => string);
  /** Row actions (rendered in last column) */
  actions?: Action<T>[];
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Keys to search across (defaults to string columns) */
  searchKeys?: string[];
  /** Controlled search value */
  searchValue?: string;
  /** Search change handler for controlled mode */
  onSearchChange?: (value: string) => void;
  /** Show entries/page selector */
  showEntriesSelector?: boolean;
  /** Entries/page options */
  entriesOptions?: number[];
  /** Default page size (alias: pageSize for backward compat) */
  defaultPageSize?: number;
  /** @deprecated Use defaultPageSize instead */
  pageSize?: number;
  /** Enable striped rows */
  striped?: boolean;
  /** Sticky table header */
  stickyHeader?: boolean;
  /** Table container class */
  containerClassName?: string;
  /** Table class */
  tableClassName?: string;
  /** Header background class */
  headerBgClassName?: string;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton rows when loading */
  skeletonRows?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state component (replaces default) */
  emptyState?: React.ReactNode;
  /** Error message */
  error?: string | null;
  /** Error state component (replaces default) */
  errorState?: React.ReactNode;
  /** On retry callback for error/empty */
  onRetry?: () => void;
  /** Controlled sort */
  sortState?: SortState;
  /** Sort change handler */
  onSortChange?: (sort: SortState) => void;
  /** Additional filter bar elements rendered above the table */
  filters?: React.ReactNode;
  /** Footer content rendered below pagination */
  footer?: React.ReactNode;
  /** Minimum height for the table area */
  minHeight?: string;
  /** Responsive: breakpoint to hide actions text */
  compactActions?: boolean;
  /** Show record count footer */
  showRecordCount?: boolean;
  /** Custom render function for rows (replaces default rendering) */
  renderRow?: (item: T, index: number) => React.ReactNode;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange?: (pageSize: number) => void;
  /** Whether to manually control pagination (e.g., server-side) */
  manualPagination?: boolean;
  /** Total items for manual pagination */
  totalItems?: number;
  /** Current page for manual pagination (0-indexed) */
  currentPage?: number;
  /** ARIA label */
  ariaLabel?: string;
}

// ── Sort Icon Helper ────────────────────────────────────

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60 transition-opacity" />;
  return direction === "asc"
    ? <ArrowUp className="h-3 w-3 text-primary" />
    : <ArrowDown className="h-3 w-3 text-primary" />;
}

// ── Empty State ─────────────────────────────────────────

function DefaultEmptyState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-primary" />
      </div>
      <p className="text-dark dark:text-white font-semibold text-lg">{message}</p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

// ── Error State ─────────────────────────────────────────

function DefaultErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-danger/10 flex items-center justify-center mx-auto mb-4">
        <Search className="h-8 w-8 text-danger" />
      </div>
      <p className="text-dark dark:text-white font-semibold text-lg">Failed to load data</p>
      <p className="text-sm text-muted mt-1 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

// ── Loading Skeleton ────────────────────────────────────

function TableSkeleton({ rows = 5, columns }: { rows?: number; columns: number }) {
  return (
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main DataTable Component ────────────────────────────

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey = "id" as keyof T,
  actions,
  searchable = true,
  searchPlaceholder = "Search...",
  searchKeys,
  searchValue: controlledSearch,
  onSearchChange,
  showEntriesSelector = true,
  entriesOptions = [5, 10, 25, 50, 100],
  defaultPageSize = 10,
  striped = true,
  stickyHeader = true,
  containerClassName,
  tableClassName,
  headerBgClassName,
  loading = false,
  skeletonRows = 5,
  emptyMessage = "No data found",
  emptyState,
  error = null,
  errorState,
  onRetry,
  sortState: controlledSort,
  onSortChange,
  filters,
  footer,
  minHeight,
  compactActions = false,
  showRecordCount = true,
  pageSize: legacyPageSize,
  renderRow,
  onPageChange,
  onPageSizeChange,
  manualPagination = false,
  totalItems: controlledTotal,
  currentPage: controlledPage,
  ariaLabel = "Data table",
}: DataTableProps<T>) {
  // ── Internal State ────────────────────────────────────

  const [internalSearch, setInternalSearch] = useState("");
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null);
  const [internalSortDir, setInternalSortDir] = useState<SortDirection>("asc");
  const [internalPage, setInternalPage] = useState(0);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize ?? legacyPageSize ?? 10);

  // Use controlled or internal state
  const search = controlledSearch ?? internalSearch;
  const sortKey = controlledSort?.key ?? internalSortKey;
  const sortDir = controlledSort?.direction ?? internalSortDir;
  const page = controlledPage ?? internalPage;
  const resolvedPageSize = defaultPageSize ?? legacyPageSize ?? internalPageSize;
  const pageSize = resolvedPageSize;

  const handleSearchChange = useCallback(
    (value: string) => {
      setInternalSearch(value);
      onSearchChange?.(value);
      setInternalPage(0);
    },
    [onSearchChange]
  );

  const handleSortToggle = useCallback(
    (key: string) => {
      let newKey = key;
      let newDir: SortDirection = "asc";

      if (sortKey === key) {
        newDir = sortDir === "asc" ? "desc" : "asc";
      }

      if (onSortChange) {
        onSortChange({ key: newKey, direction: newDir });
      } else {
        setInternalSortKey(newKey);
        setInternalSortDir(newDir);
      }
    },
    [sortKey, sortDir, onSortChange]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setInternalPage(newPage);
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setInternalPageSize(newSize);
      onPageSizeChange?.(newSize);
      setInternalPage(0);
    },
    [onPageSizeChange]
  );

  // ── Get row key ──────────────────────────────────────

  const getRowKey = useCallback(
    (item: T): string => {
      if (typeof rowKey === "function") return rowKey(item);
      return String(item[rowKey] ?? Math.random());
    },
    [rowKey]
  );

  // ── Filter (search) ──────────────────────────────────
  // In manual/server-side mode, skip client-side filtering

  const filtered = useMemo(() => {
    if (loading || error) return [];
    if (manualPagination) return data;
    if (!search) return data;

    const keys = searchKeys ?? Object.keys(data[0] ?? {}).filter(
      (k) => typeof data[0]?.[k] === "string"
    );
    const q = search.toLowerCase();
    return data.filter((item) =>
      keys.some((key) => String(item[key] ?? "").toLowerCase().includes(q))
    );
  }, [data, search, searchKeys, loading, error, manualPagination]);

  // ── Sort ─────────────────────────────────────────────
  // In manual/server-side mode, skip client-side sorting

  const sorted = useMemo(() => {
    if (manualPagination) return filtered;
    if (!sortKey || loading || error) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal ?? "");
      const strB = String(bVal ?? "");
      return sortDir === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [filtered, sortKey, sortDir, loading, error, manualPagination]);

  // ── Paginate ─────────────────────────────────────────

  const totalItems = controlledTotal ?? sorted.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginated = manualPagination
    ? sorted
    : sorted.slice(page * pageSize, (page + 1) * pageSize);

  // ── Pagination helpers ────────────────────────────────

  const startRecord = totalItems === 0 ? 0 : page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, totalItems);

  // Generate visible page numbers (max 7, with ellipsis)
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("ellipsis");
      const start = Math.max(1, page - 1);
      const end = Math.min(totalPages - 2, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 3) pages.push("ellipsis");
      pages.push(totalPages - 1);
    }
    return pages;
  }, [totalPages, page]);

  // ── Column count (including actions) ─────────────────

  const columnCount = columns.length + (actions && actions.length > 0 ? 1 : 0);

  // ── Render ────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", containerClassName)}>
      {/* Search & Filters Row */}
      {(searchable || filters) && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {searchable && (
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9 h-9"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search table"
              />
            </div>
          )}
          {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
        </div>
      )}

      {/* Table Container */}
      <div
        className={cn(
          "bg-card rounded-xl border border-border shadow-sm overflow-hidden",
          minHeight && "relative"
        )}
        style={minHeight ? { minHeight } : undefined}
        role="region"
        aria-label={ariaLabel}
      >
        {/* Loading State */}
        {loading ? (
          <TableSkeleton rows={skeletonRows} columns={columnCount} />
        ) : error ? (
          errorState ?? <DefaultErrorState message={error} onRetry={onRetry} />
        ) : paginated.length === 0 ? (
          emptyState ?? <DefaultEmptyState message={emptyMessage} onRetry={onRetry} />
        ) : (
          <>
            {/* Scrollable Table */}
            <div className="overflow-x-auto">
              <Table className={cn(tableClassName)}>
                <TableHeader>
                  <TableRow
                    className={cn(
                      stickyHeader && "sticky top-0 z-10",
                      headerBgClassName || "bg-gray-50 dark:bg-gray-800/50"
                    )}
                  >
                    {columns.map((col, idx) => {
                      const sortableKey = col.sortKey ?? col.key;
                      return (
                        <TableHead
                          key={col.key ?? idx}
                          className={cn(
                            "px-4 py-3.5",
                            col.hideOnMobile && "hidden md:table-cell",
                            col.hideOnTablet && "hidden lg:table-cell",
                            col.headerClassName
                          )}
                        >
                          {col.sortable && sortableKey ? (
                            <button
                              onClick={() => handleSortToggle(sortableKey)}
                              className={cn(
                                "group inline-flex items-center gap-1.5 hover:text-dark dark:hover:text-white transition-colors font-bold text-xs uppercase tracking-wider",
                                sortKey === sortableKey && "text-dark dark:text-white"
                              )}
                              aria-label={`Sort by ${col.header}${sortKey === sortableKey ? ` (${sortDir === "asc" ? "ascending" : "descending"})` : ""}`}
                            >
                              {col.header}
                              <SortIcon
                                active={sortKey === sortableKey}
                                direction={sortDir}
                              />
                            </button>
                          ) : (
                            <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/70">
                              {col.header}
                            </span>
                          )}
                        </TableHead>
                      );
                    })}
                    {actions && actions.length > 0 && (
                      <TableHead className="px-4 py-3.5 text-right">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted dark:text-white/70">
                          Actions
                        </span>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderRow
                    ? paginated.map((item, idx) => renderRow(item, idx))
                    : paginated.map((item, idx) => {
                        const key = getRowKey(item);
                        const isEven = idx % 2 === 0;
                        return (
                          <TableRow
                            key={key}
                            className={cn(
                              "transition-colors group",
                              striped && isEven && "bg-gray-50/50 dark:bg-gray-800/10",
                              "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            )}
                          >
                            {columns.map((col, colIdx) => (
                              <TableCell
                                key={col.key ?? colIdx}
                                className={cn(
                                  "px-4 py-3.5",
                                  col.hideOnMobile && "hidden md:table-cell",
                                  col.hideOnTablet && "hidden lg:table-cell",
                                  col.className
                                )}
                              >
                                {col.cell(item)}
                              </TableCell>
                            ))}
                            {actions && actions.length > 0 && (
                              <TableCell className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {actions
                                    .filter((action) => {
                                      if (typeof action.hidden === "function") return !action.hidden(item);
                                      return !action.hidden;
                                    })
                                    .map((action, actIdx) => {
                                      const Icon = action.icon;
                                      const isDisabled = typeof action.disabled === "function"
                                        ? action.disabled(item)
                                        : action.disabled;
                                      const variant = action.variant ?? "ghost";

                                      const button = (
                                        <TooltipProvider key={actIdx}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span tabIndex={0}>
                                                <Button
                                                  variant={variant}
                                                  size="icon-sm"
                                                  className={cn(
                                                    "h-8 w-8",
                                                    variant === "danger" && "hover:text-danger hover:bg-danger/10",
                                                    variant === "ghost" && "opacity-0 group-hover:opacity-100 transition-opacity"
                                                  )}
                                                  onClick={() => action.onClick(item)}
                                                  disabled={isDisabled}
                                                  aria-label={action.label}
                                                >
                                                  {Icon && <Icon className="h-3.5 w-3.5" />}
                                                </Button>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                              <p>{action.label}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                      return button;
                                    })}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div
              className={cn(
                "px-4 py-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted",
                "bg-gray-50/50 dark:bg-gray-800/20"
              )}
            >
              {/* Left: Entries selector & Record count */}
              <div className="flex items-center gap-3 flex-wrap">
                {showEntriesSelector && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">Show</span>
                    <div className="relative">
                      <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="h-7 rounded-md border border-input bg-background px-2 pr-6 text-xs text-dark dark:text-white appearance-none cursor-pointer focus:border-primary focus:outline-none"
                        aria-label="Entries per page"
                      >
                        {entriesOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted pointer-events-none" />
                    </div>
                    <span className="text-xs">entries</span>
                  </div>
                )}
                {showRecordCount && totalItems > 0 && (
                  <span className="text-xs">
                    Showing {startRecord} to {endRecord} of {totalItems} entries
                  </span>
                )}
              </div>

              {/* Right: Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handlePageChange(0)}
                    disabled={page === 0}
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 0}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  {pageNumbers.map((p, i) =>
                    p === "ellipsis" ? (
                      <span key={`e-${i}`} className="px-1 text-xs text-muted">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={page === p ? "primary" : "ghost"}
                        size="icon-xs"
                        onClick={() => handlePageChange(p)}
                        className={cn(
                          "text-xs min-w-[1.75rem]",
                          page === p && "shadow-sm"
                        )}
                        aria-label={`Page ${p + 1}`}
                        aria-current={page === p ? "page" : undefined}
                      >
                        {p + 1}
                      </Button>
                    )
                  )}

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages - 1}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handlePageChange(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Custom Footer */}
      {footer && <div>{footer}</div>}
    </div>
  );
}

// ── Preset Actions (for convenience) ────────────────────

export function viewAction<T>(
  onClick: (item: T) => void,
  hidden?: boolean | ((item: T) => boolean)
): Action<T> {
  return { label: "View", icon: Eye, onClick, variant: "ghost", hidden };
}

export function editAction<T>(
  onClick: (item: T) => void,
  hidden?: boolean | ((item: T) => boolean)
): Action<T> {
  return { label: "Edit", icon: Pencil, onClick, variant: "ghost", hidden };
}

export function deleteAction<T>(
  onClick: (item: T) => void,
  hidden?: boolean | ((item: T) => boolean)
): Action<T> {
  return { label: "Delete", icon: Trash2, onClick, variant: "ghost", hidden };
}
