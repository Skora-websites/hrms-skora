/**
 * Overtime detection and calculation.
 * Office hours: 10:00 AM – 7:00 PM (Mon-Fri)
 * Lunch break: 2:00 PM – 2:30 PM (not counted)
 * Overtime: Any hours logged past 7:00 PM (requires Manager approval)
 */

const OFFICE_END_HOUR = 19; // 7:00 PM
const OFFICE_START_HOUR = 10; // 10:00 AM
const LUNCH_START_HOUR = 14; // 2:00 PM
const LUNCH_END_HOUR = 14.5; // 2:30 PM

/**
 * Calculate overtime hours for a given punch in/out pair.
 * Returns 0 if no overtime.
 */
export function calculateOvertimeHours(
  punchInTime: Date | string,
  punchOutTime: Date | string
): number {
  const punchIn = new Date(punchInTime);
  const punchOut = new Date(punchOutTime);

  const punchOutHour = punchOut.getHours() + punchOut.getMinutes() / 60;

  // No overtime if punched out before office end
  if (punchOutHour <= OFFICE_END_HOUR) {
    return 0;
  }

  // Overtime is hours from 7 PM to punch out time
  const overtimeHours = punchOutHour - OFFICE_END_HOUR;
  return Math.round(overtimeHours * 100) / 100; // Round to 2 decimal places
}

/**
 * Check if a punch-in/out qualifies as overtime.
 */
export function isOvertime(punchOutTime: Date | string): boolean {
  const punchOut = new Date(punchOutTime);
  const hour = punchOut.getHours() + punchOut.getMinutes() / 60;
  return hour > OFFICE_END_HOUR;
}

/**
 * Calculate regular work hours (excluding lunch break).
 */
export function calculateWorkHours(
  punchInTime: Date | string,
  punchOutTime: Date | string
): number {
  const punchIn = new Date(punchInTime);
  const punchOut = new Date(punchOutTime);

  let startHour = punchIn.getHours() + punchIn.getMinutes() / 60;
  let endHour = punchOut.getHours() + punchOut.getMinutes() / 60;

  // Clamp to office hours
  startHour = Math.max(startHour, OFFICE_START_HOUR);
  endHour = Math.min(endHour, OFFICE_END_HOUR);

  let totalHours = endHour - startHour;

  // Subtract lunch break if it overlaps
  if (startHour < LUNCH_END_HOUR && endHour > LUNCH_START_HOUR) {
    const lunchOverlap = Math.min(endHour, LUNCH_END_HOUR) - Math.max(startHour, LUNCH_START_HOUR);
    totalHours -= Math.max(0, lunchOverlap);
  }

  return Math.round(Math.max(0, totalHours) * 100) / 100;
}

/**
 * Determine if a punch-in is a late arrival.
 */
export function isLateArrival(punchInTime: Date | string): boolean {
  const punchIn = new Date(punchInTime);
  const hour = punchIn.getHours() + punchIn.getMinutes() / 60;
  return hour > 10.5; // After 10:30 AM
}

/**
 * Check if currently in lunch break.
 */
export function isCurrentlyLunchBreak(): boolean {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  return hour >= LUNCH_START_HOUR && hour < LUNCH_END_HOUR;
}
