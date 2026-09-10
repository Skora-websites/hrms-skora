/**
 * Server-side attendance rule calculations.
 */

const DEFAULT_OFFICE_START = 10; // 10:00 AM
const DEFAULT_LATE_AFTER = 10.5; // 10:30 AM
const DEFAULT_HALF_DAY_AFTER = 14.5; // 2:30 PM
const DEFAULT_OFFICE_END = 19; // 7:00 PM
const LUNCH_BREAK_MINUTES = 30;

/**
 * Determine attendance status based on the current time of punch-in.
 * - Before office start: PRESENT
 * - After office start but before late threshold: PRESENT
 * - After late threshold but before half-day threshold: LATE
 * - After half-day threshold: HALF_DAY
 */
export function evaluatePunchStatus(now: Date): "PRESENT" | "LATE" | "HALF_DAY" {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour <= DEFAULT_LATE_AFTER) return "PRESENT";
  if (hour <= DEFAULT_HALF_DAY_AFTER) return "LATE";
  return "HALF_DAY";
}

/**
 * Calculate overtime hours after the default office end time (7 PM).
 * Returns 0 if no overtime.
 */
export function calculateOvertimeHours(now: Date): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  const overtime = hour - DEFAULT_OFFICE_END;
  return overtime > 0 ? Math.round(overtime * 100) / 100 : 0;
}

/**
 * Calculate effective work hours between punch-in and punch-out,
 * deducting a 30-minute lunch break if the span is long enough.
 */
export function calculateEffectiveWorkHours(punchIn: Date, punchOut: Date): number {
  const totalMs = punchOut.getTime() - punchIn.getTime();
  const totalHours = totalMs / (1000 * 60 * 60);
  // Deduct lunch break if worked more than 4.5 hours
  const lunchDeduction = totalHours > 4.5 ? LUNCH_BREAK_MINUTES / 60 : 0;
  const effective = Math.max(0, totalHours - lunchDeduction);
  return Math.round(effective * 100) / 100;
}

/**
 * Determine the escalation target role for attendance requests.
 * - SUPER_ADMIN and HR_ADMIN requests escalate to SUPER_ADMIN
 * - MANAGER and EMPLOYEE requests escalate to MANAGER
 */
export function getEscalationTargetRole(
  userRole: string
): "SUPER_ADMIN" | "MANAGER" {
  const norm = (userRole || "").toUpperCase();
  if (norm === "SUPER_ADMIN" || norm === "SUPERADMIN" || norm === "HR_ADMIN" || norm === "HRADMIN" || norm === "ADMIN") {
    return "SUPER_ADMIN";
  }
  return "MANAGER";
}
