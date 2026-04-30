export const APP_NAME = "Munera";
export const DEFAULT_GEOFENCE_RADIUS = 100; // meters
export const DEFAULT_BREAK_MINUTES = 60;
export const DEFAULT_WORK_MINUTES = 480; // 8 hours
export const GPS_TIMEOUT = 10000; // 10 seconds
export const GPS_MAX_AGE = 0;

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  submitted: "申請済",
  approved: "承認済",
  rejected: "却下",
  on_hold: "保留",
  paid: "支払済",
};

export const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  clock_in: "出勤",
  clock_out: "退勤",
  break_start: "休憩開始",
  break_end: "休憩終了",
};

export const OVERTIME_STATUS_LABELS: Record<string, string> = {
  pre_detected: "自動検知",
  acknowledged: "確認済",
  approved: "承認済",
  rejected: "却下",
};
