import {
  genId,
  dateRange,
  formatDate,
  formatTime,
  isWeekend,
  shouldInjectError,
  pickErrorType,
  randomInt,
  randomFloat,
  round2,
} from "../utils.js";
import { DATA_START_DATE, DATA_END_DATE, GERMAN_HOLIDAYS } from "../config.js";
import type { Employee, TimeEntry } from "../types.js";

const TIME_ERROR_TYPES = [
  "missing_clock_out",        // Forgot to clock out
  "overtime_not_recorded",    // Worked overtime but not logged
  "buddy_punching",           // Someone else clocked in for them
  "hours_mismatch",           // Actual hours don't match clock times
  "vacation_not_approved",    // Took vacation without approval record
  "worked_on_holiday",        // Worked on public holiday without premium pay flag
];

function isGermanHoliday(date: Date): boolean {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return GERMAN_HOLIDAYS.includes(mmdd);
}

export function generateTimeEntries(employees: Employee[]): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const allDates = dateRange(DATA_START_DATE, DATA_END_DATE);

  // Only generate for a sample of dates to keep data manageable
  // Generate weekly summaries instead of daily for HQ, daily for stores
  for (const employee of employees) {
    const empStart = new Date(employee.hireDate);
    const empEnd = employee.terminationDate
      ? new Date(employee.terminationDate)
      : new Date(DATA_END_DATE);

    // Sample: generate 1 entry per work week (Monday) to keep scale reasonable
    // For retail, generate daily entries for last 2 years only
    const isRetail = employee.department === "Retail";
    const sampleStart = isRetail
      ? new Date(Math.max(empStart.getTime(), new Date("2024-01-01").getTime()))
      : empStart;

    for (const date of allDates) {
      if (date < sampleStart || date > empEnd) continue;

      // For HQ: only sample Mondays (weekly summary)
      if (!isRetail && date.getDay() !== 1) continue;

      // Skip weekends for full-time
      if (isWeekend(date) && employee.employmentType !== "part_time") continue;

      const isHoliday = isGermanHoliday(date);
      const scheduledHours = employee.employmentType === "part_time" ? 4 : 8;

      // Determine status
      let status: TimeEntry["status"] = "present";
      const rand = Math.random();

      if (isHoliday) {
        status = "holiday";
      } else if (rand < 0.02) {
        status = "sick";
      } else if (rand < 0.06) {
        status = "vacation";
      } else if (rand < 0.07) {
        status = "absent";
      }

      // Clock times
      const baseClockIn = randomInt(7, 9);
      const clockInMin = randomInt(0, 59);
      const workHours = status === "present"
        ? scheduledHours + (Math.random() < 0.2 ? randomFloat(0.5, 3) : 0)
        : 0;
      const clockOutHour = baseClockIn + Math.floor(workHours + 0.5); // +0.5 for lunch
      const clockOutMin = randomInt(0, 59);
      const breakMins = status === "present" ? (workHours > 6 ? 30 : 0) : 0;

      const actualHours = status === "present"
        ? round2(workHours - breakMins / 60)
        : 0;
      const overtimeHours = status === "present"
        ? round2(Math.max(0, actualHours - scheduledHours))
        : 0;

      // ─── Error Injection ───
      let hasError = false;
      let errorType: string | null = null;
      let finalClockOut = formatTime(Math.min(clockOutHour, 23), clockOutMin);
      let finalActualHours = actualHours;
      let finalOvertimeHours = overtimeHours;

      if (shouldInjectError() && status === "present") {
        hasError = true;
        errorType = pickErrorType(TIME_ERROR_TYPES);

        switch (errorType) {
          case "missing_clock_out":
            finalClockOut = "";
            break;
          case "overtime_not_recorded":
            finalOvertimeHours = 0;
            // actual hours still show overtime was worked
            finalActualHours = round2(scheduledHours + randomFloat(1, 4));
            break;
          case "hours_mismatch":
            // Reported hours don't match clock in/out difference
            finalActualHours = round2(actualHours + randomFloat(-2, 3));
            break;
          case "buddy_punching":
          case "vacation_not_approved":
          case "worked_on_holiday":
            // Flagged but times may look normal
            break;
        }
      }

      entries.push({
        id: genId(),
        employeeId: employee.id,
        date: formatDate(date),
        clockIn: status === "present" ? formatTime(baseClockIn, clockInMin) : "",
        clockOut: status === "present" ? finalClockOut : "",
        scheduledHours,
        actualHours: finalActualHours,
        overtimeHours: finalOvertimeHours,
        breakMinutes: breakMins,
        status,
        hasError,
        errorType,
      });
    }
  }

  return entries;
}
