import { z } from "zod";

// ---- Auth ----
export const loginSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上です"),
});

// ---- Attendance ----
export const punchSchema = z.object({
  record_type: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  offsite_reason: z.string().optional(),
});

// ---- Expense ----
export const expenseSchema = z.object({
  category_id: z.string().uuid("カテゴリを選択してください"),
  expense_date: z.string().min(1, "日付を入力してください"),
  amount: z.number().positive("金額は0より大きい値を入力してください"),
  description: z.string().min(1, "説明を入力してください"),
});

export const expenseApprovalSchema = z.object({
  application_id: z.string().uuid(),
  action: z.enum(["approved", "rejected", "on_hold"]),
  comment: z.string().optional(),
});

// ---- User ----
export const userSchema = z.object({
  full_name: z.string().min(1, "氏名を入力してください"),
  full_name_kana: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(["staff", "sv", "admin"]),
});

// ---- Workplace ----
export const workplaceSchema = z.object({
  name: z.string().min(1, "拠点名を入力してください"),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().int().positive().default(100),
});

// ---- Shift ----
export const shiftSchema = z.object({
  name: z.string().min(1, "シフト名を入力してください"),
  shift_type: z.enum(["day", "night", "flex", "custom"]),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM形式で入力"),
  break_minutes: z.number().int().min(0).default(60),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PunchInput = z.infer<typeof punchSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseApprovalInput = z.infer<typeof expenseApprovalSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type WorkplaceInput = z.infer<typeof workplaceSchema>;
export type ShiftInput = z.infer<typeof shiftSchema>;
