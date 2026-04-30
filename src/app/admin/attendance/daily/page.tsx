"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { DataTable } from "@/components/shared/data-table";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { createClient } from "@/lib/supabase/client";

interface DailyRow extends Record<string, unknown> {
  name: string;
  scheduled: string;
  actual: string;
  workMin: number;
  otMin: number;
  late: boolean;
}

const columns = [
  { key: "name", header: "氏名" },
  { key: "scheduled", header: "予定" },
  { key: "actual", header: "実績" },
  {
    key: "workMin",
    header: "稼働",
    render: (row: Record<string, unknown>) => {
      const m = row.workMin as number;
      return `${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, "0")}m`;
    },
  },
  {
    key: "otMin",
    header: "残業",
    render: (row: Record<string, unknown>) => {
      const m = row.otMin as number;
      return m > 0 ? <span className="text-orange-400">{m}m</span> : "—";
    },
  },
  {
    key: "late",
    header: "遅刻",
    render: (row: Record<string, unknown>) =>
      row.late ? <span className="text-red-400">Yes</span> : "—",
  },
];

export default function AdminDailyAttendancePage() {
  const [data, setData] = useState<DailyRow[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, lateCount: 0, otTotal: "0h 00m" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("id, tenant_id")
        .eq("supabase_auth_id", user.id)
        .single();
      if (!coreUser) { setIsLoading(false); return; }

      // Get today (JST)
      const now = new Date();
      const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const todayStr = jstNow.toISOString().slice(0, 10);

      // Tenant users
      const { data: users } = await supabase
        .from("core_users")
        .select("id, full_name")
        .eq("tenant_id", coreUser.tenant_id)
        .eq("is_active", true);
      if (!users) { setIsLoading(false); return; }

      const userMap = new Map(users.map((u) => [u.id, u.full_name]));
      const userIds = users.map((u) => u.id);

      // Daily summaries for today
      const { data: summaries } = await supabase
        .from("attn_daily_summary")
        .select("user_id, shift_id, first_clock_in, last_clock_out, total_work_min, total_break_min, overtime_min, is_late")
        .in("user_id", userIds)
        .eq("work_date", todayStr);

      // Get shifts for scheduled times
      const shiftIds = [...new Set((summaries ?? []).map((s) => s.shift_id).filter(Boolean))];
      const shiftMap = new Map<string, string>();
      if (shiftIds.length > 0) {
        const { data: shifts } = await supabase
          .from("attn_shifts")
          .select("id, start_time, end_time")
          .in("id", shiftIds);
        if (shifts) {
          for (const s of shifts) {
            shiftMap.set(s.id, `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`);
          }
        }
      }

      const formatTime = (iso: string | null) => {
        if (!iso) return "--:--";
        return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
      };

      let lateCount = 0;
      let otTotalMin = 0;

      const rows: DailyRow[] = (summaries ?? []).map((s) => {
        if (s.is_late) lateCount++;
        otTotalMin += s.overtime_min ?? 0;
        return {
          name: userMap.get(s.user_id) ?? "不明",
          scheduled: s.shift_id ? (shiftMap.get(s.shift_id) ?? "-") : "-",
          actual: `${formatTime(s.first_clock_in)}-${formatTime(s.last_clock_out)}`,
          workMin: s.total_work_min ?? 0,
          otMin: s.overtime_min ?? 0,
          late: s.is_late ?? false,
        };
      });

      setData(rows);
      setMetrics({
        total: users.length,
        lateCount,
        otTotal: `${Math.floor(otTotalMin / 60)}h ${(otTotalMin % 60).toString().padStart(2, "0")}m`,
      });
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <h3 className="text-sm text-zinc-500 uppercase tracking-widest mb-4">日次明細</h3>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">総スタッフ</p>
          <p className="text-2xl font-light mt-2">{metrics.total}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">本日遅刻</p>
          <p className={`text-2xl font-light mt-2 ${metrics.lateCount > 0 ? "text-red-400" : ""}`}>{metrics.lateCount}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">残業合計</p>
          <p className="text-2xl font-light mt-2 text-orange-400">{metrics.otTotal}</p>
        </GlassCard>
      </div>

      <DataTable columns={columns} data={data} />
    </>
  );
}
