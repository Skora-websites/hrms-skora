"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { SortState, SortDirection } from "@/components/shared/data-table";

// ── Options ─────────────────────────────────────────────

export interface UseServerTableOptions {
  /** Initial page size (default: 10) */
  defaultPageSize?: number;
  /** Initial sort column key */
  defaultSortKey?: string;
  /** Initial sort direction (default: "asc") */
  defaultSortDir?: SortDirection;
  /** Debounce delay for search input in ms (default: 300). Set to 0 to disable. */
  debounceMs?: number;
  /** Callback fired when any filter/page state changes */
  onStateChange?: (state: ServerTableState) => void;
}

export interface ServerTableState {
  page: number;
  pageSize: number;
  search: string;
  sortKey: string | null;
  sortDir: SortDirection;
}

// ── Return type ─────────────────────────────────────────

export interface UseServerTableReturn {
  /** Current state */
  state: ServerTableState;

  /** Build URL search params string from current state */
  queryString: string;

  /** Build a URLSearchParams object from current state */
  searchParams: URLSearchParams;

  /** Manually reset to page 0 */
  resetPage: () => void;

  /** DataTable props — spread directly onto <DataTable> */
  dataTableProps: {
    manualPagination: true;
    currentPage: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    sortState?: SortState;
    onSortChange?: (sort: SortState) => void;
  };

  // Individual callbacks (useful if you need to pass them separately)
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: SortState) => void;
}

// ── Hook ────────────────────────────────────────────────

export function useServerTable(options: UseServerTableOptions = {}): UseServerTableReturn {
  const {
    defaultPageSize = 10,
    defaultSortKey,
    defaultSortDir = "asc",
    debounceMs = 300,
    onStateChange,
  } = options;

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);

  // ── Debounced search ────────────────────────────────

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);

      if (debounceMs > 0) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setDebouncedSearch(value);
          setPage(0);
        }, debounceMs);
      } else {
        setDebouncedSearch(value);
        setPage(0);
      }
    },
    [debounceMs]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Page change ─────────────────────────────────────

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // ── Page size change ────────────────────────────────

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  // ── Sort change ─────────────────────────────────────

  const handleSortChange = useCallback((sort: SortState) => {
    setSortKey(sort.key);
    setSortDir(sort.direction);
    setPage(0);
  }, []);

  // ── Reset page ──────────────────────────────────────

  const resetPage = useCallback(() => {
    setPage(0);
  }, []);

  // ── Build state object ──────────────────────────────

  const state: ServerTableState = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      sortKey,
      sortDir,
    }),
    [page, pageSize, debouncedSearch, sortKey, sortDir]
  );

  // ── Notify on state change ──────────────────────────

  useEffect(() => {
    onStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, sortKey, sortDir]);

  // ── Build query string ──────────────────────────────

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (sortKey) params.set("sortKey", sortKey);
    params.set("sortDir", sortDir);
    return params;
  }, [page, pageSize, debouncedSearch, sortKey, sortDir]);

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  // ── DataTable props ─────────────────────────────────

  const dataTableProps = useMemo(
    () => ({
      manualPagination: true as const,
      currentPage: page,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange,
      searchValue: search,
      onSearchChange: handleSearchChange,
      onSortChange: handleSortChange,
      ...(sortKey
        ? { sortState: { key: sortKey, direction: sortDir } as SortState }
        : {}),
    }),
    [page, sortKey, sortDir, search, handlePageChange, handlePageSizeChange, handleSearchChange, handleSortChange]
  );

  return {
    state,
    queryString,
    searchParams,
    resetPage,
    dataTableProps,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    onSearchChange: handleSearchChange,
    onSortChange: handleSortChange,
  };
}
