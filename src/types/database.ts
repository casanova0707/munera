// Database types - mirrors Supabase schema
// In production, replace with `supabase gen types typescript`

export type UserRole = "staff" | "sv" | "admin";
export type AuthMethod = "line" | "email";
export type AttendanceType = "clock_in" | "clock_out" | "break_start" | "break_end";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "on_hold";
export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected" | "on_hold" | "paid";
export type OvertimeStatus = "pre_detected" | "acknowledged" | "approved" | "rejected";
export type ShiftType = "day" | "night" | "flex" | "custom";

// ---- Core ----

export interface CoreTenant {
  id: string;
  name: string;
  name_kana: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreUser {
  id: string;
  supabase_auth_id: string;
  tenant_id: string;
  employee_code: string | null;
  role: UserRole;
  auth_method: AuthMethod;
  full_name: string;
  full_name_kana: string | null;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  is_active: boolean;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoreWorkplace {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Attendance ----

export interface AttnShift {
  id: string;
  tenant_id: string;
  name: string;
  shift_type: ShiftType;
  start_time: string; // TIME as string "HH:MM:SS"
  end_time: string;
  break_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttnClock {
  id: string;
  user_id: string;
  record_type: AttendanceType;
  punched_at: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  workplace_id: string | null;
  is_offsite: boolean;
  offsite_reason: string | null;
  device_info: Record<string, unknown> | null;
  photo_url: string | null;
  created_at: string;
}

export interface AttnDailySummary {
  id: string;
  user_id: string;
  work_date: string;
  shift_id: string | null;
  first_clock_in: string | null;
  last_clock_out: string | null;
  total_work_min: number | null;
  total_break_min: number | null;
  overtime_min: number;
  is_late: boolean;
  is_early_leave: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttnApproval {
  id: string;
  target_type: string;
  target_id: string;
  approver_id: string;
  action: ApprovalStatus;
  comment: string | null;
  acted_at: string;
}

export interface AttnOvertime {
  id: string;
  user_id: string;
  work_date: string;
  detected_minutes: number;
  status: OvertimeStatus;
  approved_by: string | null;
  approved_at: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Expense ----

export interface ExpCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  max_amount: number | null;
  requires_receipt: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ExpApplication {
  id: string;
  user_id: string;
  category_id: string;
  expense_date: string;
  amount: number;
  currency: string;
  description: string;
  status: ExpenseStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpReceiptImage {
  id: string;
  application_id: string;
  image_url: string;
  thumbnail_url: string | null;
  ocr_result: Record<string, unknown> | null;
  created_at: string;
}

// ---- System ----

export interface SysTableMetadata {
  id: string;
  schema_name: string;
  table_name: string;
  display_name: string;
  display_name_ja: string | null;
  description: string | null;
  module: string;
  is_master: boolean;
  created_at: string;
  updated_at: string;
}

export interface SysAuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  actor_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
