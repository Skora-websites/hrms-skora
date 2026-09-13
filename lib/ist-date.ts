/**
 * Shared date helpers.
 *
 * Attendance is keyed by the office calendar date (Asia/Kolkata, IST) so the
 * client and server always agree on which records belong to "today", regardless
 * of device/server timezone. Keep this module dependency-free so both client
 * components and server modules can import it.
 */

export const OFFICE_TIMEZONE = "Asia/Kolkata";

/** `YYYY-MM-DD` key for the office timezone (IST). */
export function istDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
