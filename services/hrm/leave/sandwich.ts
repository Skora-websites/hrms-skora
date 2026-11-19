/**
 * Sandwich Rule & Leave Day Calculation Engine
 * 
 * In standard Indian corporate leave policy:
 * When sandwichRuleEnabled is TRUE:
 * If an employee's approved leave spans across a weekly off (Sunday) or public holiday
 * (i.e. they take leave both before and after the off-day), the intervening off-days
 * are also counted as leave and debited from the employee's leave balance.
 */

export interface SandwichLeaveCalculationParams {
  startDate: string | Date;
  endDate: string | Date;
  sandwichRuleEnabled: boolean;
  weeklyOffDays?: number[]; // default [0] for Sunday (since organization works Mon-Sat)
  holidays?: string[]; // YYYY-MM-DD dates of public holidays
  isHalfDay?: boolean;
}

export interface DayLeaveDetail {
  date: string;
  dayOfWeek: number;
  type: "working_leave" | "sandwiched_weekly_off" | "sandwiched_holiday" | "regular_weekly_off" | "regular_holiday";
  deducted: boolean;
}

export interface SandwichLeaveResult {
  totalDeductionDays: number;
  actualWorkingLeaveDays: number;
  sandwichedOffDays: number;
  sandwichedHolidays: number;
  breakdown: DayLeaveDetail[];
}

export function calculateSandwichLeave(params: SandwichLeaveCalculationParams): SandwichLeaveResult {
  const start = typeof params.startDate === "string" ? new Date(params.startDate) : new Date(params.startDate.getTime());
  const end = typeof params.endDate === "string" ? new Date(params.endDate) : new Date(params.endDate.getTime());
  const weeklyOffs = params.weeklyOffDays ?? [0]; // Sunday = 0
  const holidaySet = new Set(params.holidays || []);

  if (params.isHalfDay) {
    const dateStr = start.toISOString().slice(0, 10);
    return {
      totalDeductionDays: 0.5,
      actualWorkingLeaveDays: 0.5,
      sandwichedOffDays: 0,
      sandwichedHolidays: 0,
      breakdown: [
        {
          date: dateStr,
          dayOfWeek: start.getDay(),
          type: "working_leave",
          deducted: true,
        },
      ],
    };
  }

  // Generate sequence of calendar days
  const days: Array<{ dateStr: string; dayOfWeek: number; isOff: boolean; isHoliday: boolean }> = [];
  const curr = new Date(start);
  while (curr <= end) {
    const dateStr = curr.toISOString().slice(0, 10);
    const dayOfWeek = curr.getDay();
    const isOff = weeklyOffs.includes(dayOfWeek);
    const isHoliday = holidaySet.has(dateStr);

    days.push({ dateStr, dayOfWeek, isOff, isHoliday });
    curr.setDate(curr.getDate() + 1);
  }

  let actualWorkingLeaveDays = 0;
  let sandwichedOffDays = 0;
  let sandwichedHolidays = 0;
  const breakdown: DayLeaveDetail[] = [];

  const n = days.length;

  for (let i = 0; i < n; i++) {
    const day = days[i];

    if (!day.isOff && !day.isHoliday) {
      // Normal working day on leave
      actualWorkingLeaveDays++;
      breakdown.push({
        date: day.dateStr,
        dayOfWeek: day.dayOfWeek,
        type: "working_leave",
        deducted: true,
      });
    } else {
      // It's a weekly off or holiday
      if (params.sandwichRuleEnabled) {
        // Check if there is a working leave day before and after this off-period within the span
        const hasWorkingBefore = days.slice(0, i).some((d) => !d.isOff && !d.isHoliday);
        const hasWorkingAfter = days.slice(i + 1).some((d) => !d.isOff && !d.isHoliday);

        if (hasWorkingBefore && hasWorkingAfter) {
          // Sandwiched!
          if (day.isOff) sandwichedOffDays++;
          else sandwichedHolidays++;

          breakdown.push({
            date: day.dateStr,
            dayOfWeek: day.dayOfWeek,
            type: day.isOff ? "sandwiched_weekly_off" : "sandwiched_holiday",
            deducted: true,
          });
        } else {
          // At boundary (e.g. leave ends on Sunday), not sandwiched
          breakdown.push({
            date: day.dateStr,
            dayOfWeek: day.dayOfWeek,
            type: day.isOff ? "regular_weekly_off" : "regular_holiday",
            deducted: false,
          });
        }
      } else {
        // Sandwich rule disabled: off days are free
        breakdown.push({
          date: day.dateStr,
          dayOfWeek: day.dayOfWeek,
          type: day.isOff ? "regular_weekly_off" : "regular_holiday",
          deducted: false,
        });
      }
    }
  }

  const totalDeductionDays = actualWorkingLeaveDays + (params.sandwichRuleEnabled ? sandwichedOffDays + sandwichedHolidays : 0);

  return {
    totalDeductionDays,
    actualWorkingLeaveDays,
    sandwichedOffDays,
    sandwichedHolidays,
    breakdown,
  };
}
