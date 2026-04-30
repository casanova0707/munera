import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("user_id"); // "all" or specific UUID
  const department = searchParams.get("department"); // "all" or specific dept

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin/sv role
  const { data: me } = await supabase
    .from("core_users")
    .select("role, tenant_id")
    .eq("supabase_auth_id", user.id)
    .single();
  if (!me || (me.role !== "admin" && me.role !== "sv")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get target users
  let targetUserIds: string[] = [];
  if (userId && userId !== "all") {
    targetUserIds = [userId];
  } else {
    let query = supabase
      .from("core_users")
      .select("id, department")
      .eq("is_active", true)
      .eq("tenant_id", me.tenant_id);

    if (department && department !== "all") {
      query = query.eq("department", department);
    }

    const { data: users } = await query;
    targetUserIds = (users ?? []).map((u) => u.id);
  }

  if (targetUserIds.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // Get user info
  const { data: userInfos } = await supabase
    .from("core_users")
    .select("id, full_name, employee_code, department")
    .in("id", targetUserIds);
  const userMap = new Map((userInfos ?? []).map((u) => [u.id, u]));

  // Get daily summaries
  const { data: summaries } = await supabase
    .from("attn_daily_summary")
    .select("user_id, work_date, shift_id, first_clock_in, last_clock_out, total_work_min, total_break_min, overtime_min, is_late, is_early_leave")
    .in("user_id", targetUserIds)
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: true });

  // Get shift info
  const shiftIds = [...new Set((summaries ?? []).map((s) => s.shift_id).filter(Boolean))];
  const { data: shifts } = shiftIds.length > 0
    ? await supabase.from("attn_shifts").select("id, name, start_time, end_time").in("id", shiftIds)
    : { data: [] };
  const shiftMap = new Map((shifts ?? []).map((s) => [s.id, s]));

  // Group by user
  const grouped: Record<string, {
    user: { id: string; full_name: string; employee_code: string | null; department: string | null };
    records: {
      work_date: string;
      shift_name: string | null;
      clock_in: string | null;
      clock_out: string | null;
      work_min: number;
      break_min: number;
      overtime_min: number;
      is_late: boolean;
      is_early_leave: boolean;
    }[];
    totals: { work_min: number; break_min: number; overtime_min: number; late_count: number; early_leave_count: number };
  }> = {};

  for (const uid of targetUserIds) {
    const info = userMap.get(uid);
    if (!info) continue;
    grouped[uid] = {
      user: info,
      records: [],
      totals: { work_min: 0, break_min: 0, overtime_min: 0, late_count: 0, early_leave_count: 0 },
    };
  }

  for (const s of summaries ?? []) {
    const g = grouped[s.user_id];
    if (!g) continue;
    const shift = s.shift_id ? shiftMap.get(s.shift_id) : null;
    const formatTime = (ts: string | null) => ts ? new Date(ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }) : null;

    g.records.push({
      work_date: s.work_date,
      shift_name: shift?.name ?? null,
      clock_in: formatTime(s.first_clock_in),
      clock_out: formatTime(s.last_clock_out),
      work_min: s.total_work_min ?? 0,
      break_min: s.total_break_min ?? 0,
      overtime_min: s.overtime_min ?? 0,
      is_late: s.is_late ?? false,
      is_early_leave: s.is_early_leave ?? false,
    });

    g.totals.work_min += s.total_work_min ?? 0;
    g.totals.break_min += s.total_break_min ?? 0;
    g.totals.overtime_min += s.overtime_min ?? 0;
    if (s.is_late) g.totals.late_count++;
    if (s.is_early_leave) g.totals.early_leave_count++;
  }

  return NextResponse.json({
    period: { from, to },
    users: Object.values(grouped),
  });
}
