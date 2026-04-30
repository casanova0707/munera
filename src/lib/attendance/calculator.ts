import type { AttnClock, AttnShift } from "@/types/database";

interface DailySummaryResult {
  firstClockIn: string | null;
  lastClockOut: string | null;
  totalWorkMin: number;
  totalBreakMin: number;
  overtimeMin: number;
  isLate: boolean;
  isEarlyLeave: boolean;
}

/**
 * Calculate daily work summary from clock records
 */
export function calculateDailySummary(
  clocks: AttnClock[],
  shift?: AttnShift | null
): DailySummaryResult {
  const sorted = [...clocks].sort(
    (a, b) => new Date(a.punched_at).getTime() - new Date(b.punched_at).getTime()
  );

  const clockIns = sorted.filter((c) => c.record_type === "clock_in");
  const clockOuts = sorted.filter((c) => c.record_type === "clock_out");
  const breakStarts = sorted.filter((c) => c.record_type === "break_start");
  const breakEnds = sorted.filter((c) => c.record_type === "break_end");

  const firstClockIn = clockIns[0]?.punched_at ?? null;
  const lastClockOut = clockOuts[clockOuts.length - 1]?.punched_at ?? null;

  // Total elapsed time
  let totalWorkMin = 0;
  if (firstClockIn && lastClockOut) {
    totalWorkMin = Math.floor(
      (new Date(lastClockOut).getTime() - new Date(firstClockIn).getTime()) /
        60000
    );
  }

  // Break time
  let totalBreakMin = 0;
  const breakPairs = Math.min(breakStarts.length, breakEnds.length);
  for (let i = 0; i < breakPairs; i++) {
    totalBreakMin += Math.floor(
      (new Date(breakEnds[i].punched_at).getTime() -
        new Date(breakStarts[i].punched_at).getTime()) /
        60000
    );
  }

  // Net work = total - break
  const netWorkMin = Math.max(0, totalWorkMin - totalBreakMin);

  // Shift-based calculations
  let scheduledMin = 480; // default 8h
  let isLate = false;
  let isEarlyLeave = false;

  if (shift) {
    const [sh, sm] = shift.start_time.split(":").map(Number);
    const [eh, em] = shift.end_time.split(":").map(Number);
    scheduledMin = (eh * 60 + em) - (sh * 60 + sm) - shift.break_minutes;

    if (firstClockIn) {
      const clockInDate = new Date(firstClockIn);
      const clockInMinutes = clockInDate.getHours() * 60 + clockInDate.getMinutes();
      const shiftStartMinutes = sh * 60 + sm;
      // 遅刻 = シフト開始から10分以上遅れた場合
      isLate = clockInMinutes > shiftStartMinutes + 10;
    }

    if (lastClockOut) {
      const clockOutDate = new Date(lastClockOut);
      const clockOutMinutes = clockOutDate.getHours() * 60 + clockOutDate.getMinutes();
      const shiftEndMinutes = eh * 60 + em;
      isEarlyLeave = clockOutMinutes < shiftEndMinutes;
    }
  }

  const overtimeMin = Math.max(0, netWorkMin - scheduledMin);

  return {
    firstClockIn,
    lastClockOut,
    totalWorkMin: netWorkMin,
    totalBreakMin,
    overtimeMin,
    isLate,
    isEarlyLeave,
  };
}

/**
 * Check if a clock-in is pre-overtime (before shift start)
 */
export function isPreOvertime(
  clockInTime: Date,
  shift: AttnShift
): { isPreOT: boolean; minutesBefore: number } {
  const [sh, sm] = shift.start_time.split(":").map(Number);
  const shiftStartMin = sh * 60 + sm;
  const clockInMin = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  const diff = shiftStartMin - clockInMin;

  return {
    isPreOT: diff > 0,
    minutesBefore: Math.max(0, diff),
  };
}

/**
 * Format minutes to "Xh Ym" display
 */
export function formatWorkTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
