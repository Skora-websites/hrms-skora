import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with compact notation (e.g., 1.5K, 3.2M)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toString();
}

/**
 * Format a date string
 */
export function formatDate(
  date: Date | string | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", options);
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return formatDate(d);
}

/** Alias for getRelativeTime */
export function getTimeAgo(date: Date | string): string {
  return getRelativeTime(date);
}

/**
 * Get initials from a name string
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Generate a random hex color for avatars
 */
export function getAvatarColor(name: string): string {
  const colors = [
    "#5e72e4", "#2dce89", "#11cdef", "#fb6340", "#f5365c",
    "#825ee4", "#2dcecc", "#1171ef", "#fbb140", "#f56036",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Truncate text with ellipsis
 */
// ── Report Export Helpers ──────────────────────────────

/**
 * Convert an array of objects to CSV string.
 */
export function toCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (!data.length) return "";

  const keys = columns
    ? columns.map((c) => c.key)
    : (Object.keys(data[0]) as (keyof T)[]);

  const labels = columns
    ? columns.map((c) => c.label)
    : keys.map((k) => String(k));

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = labels.map(escapeCell).join(",");
  const rows = data.map((row) =>
    keys.map((key) => escapeCell(row[key])).join(",")
  );

  return [header, ...rows].join("\n");
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger a JSON file download in the browser.
 */
export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Get status color class based on status string
 */
export function getStatusColor(
  status: string
): { bg: string; text: string; dot: string } {
  const statusLower = status.toLowerCase();
  if (["active", "completed", "won", "approved", "paid"].includes(statusLower))
    return {
      bg: "bg-gradient-success-subtle",
      text: "text-success",
      dot: "bg-success",
    };
  if (
    ["pending", "in_progress", "negotiation", "review", "proposal"].includes(
      statusLower
    )
  )
    return {
      bg: "bg-gradient-warning-subtle",
      text: "text-warning",
      dot: "bg-warning",
    };
  if (["inactive", "lost", "rejected", "cancelled", "overdue"].includes(statusLower))
    return {
      bg: "bg-gradient-danger-subtle",
      text: "text-danger",
      dot: "bg-danger",
    };
  if (["new", "lead", "qualified", "contacted"].includes(statusLower))
    return {
      bg: "bg-gradient-info-subtle",
      text: "text-info",
      dot: "bg-info",
    };
  return {
    bg: "bg-gradient-primary-subtle",
    text: "text-primary",
    dot: "bg-primary",
  };
}
