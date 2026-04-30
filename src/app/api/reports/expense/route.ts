import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const userId = searchParams.get("user_id");
  const department = searchParams.get("department");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Get expense applications
  const { data: expenses } = await supabase
    .from("exp_applications")
    .select("id, user_id, category_id, expense_date, amount, description, status, submitted_at")
    .in("user_id", targetUserIds)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: true });

  // Get categories
  const catIds = [...new Set((expenses ?? []).map((e) => e.category_id).filter(Boolean))];
  const { data: categories } = catIds.length > 0
    ? await supabase.from("exp_categories").select("id, name").in("id", catIds)
    : { data: [] };
  const catMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  // Group by user
  const grouped: Record<string, {
    user: { id: string; full_name: string; employee_code: string | null; department: string | null };
    records: {
      expense_date: string;
      category: string;
      description: string | null;
      amount: number;
      status: string;
    }[];
    total_amount: number;
  }> = {};

  for (const uid of targetUserIds) {
    const info = userMap.get(uid);
    if (!info) continue;
    grouped[uid] = { user: info, records: [], total_amount: 0 };
  }

  for (const e of expenses ?? []) {
    const g = grouped[e.user_id];
    if (!g) continue;
    const amount = Number(e.amount);
    g.records.push({
      expense_date: e.expense_date,
      category: catMap.get(e.category_id) ?? "-",
      description: e.description,
      amount,
      status: e.status,
    });
    g.total_amount += amount;
  }

  return NextResponse.json({
    period: { from, to },
    users: Object.values(grouped),
  });
}
