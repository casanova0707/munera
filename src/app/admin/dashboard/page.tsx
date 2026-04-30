"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { createClient } from "@/lib/supabase/client";

interface Metrics {
  pendingApprovals: number;
  workingCount: number;
  totalStaff: number;
  offsiteAlerts: number;
  monthlyOvertimeMin: number;
}

interface RecentClock {
  userName: string;
  type: string;
  time: string;
  isOffsite: boolean;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    pendingApprovals: 0,
    workingCount: 0,
    totalStaff: 0,
    offsiteAlerts: 0,
    monthlyOvertimeMin: 0,
  });
  const [recentClocks, setRecentClocks] = useState<RecentClock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("id, tenant_id")
        .eq("supabase_auth_id", user.id)
        .single();

      if (!coreUser) {
        setIsLoading(false);
        return;
      }

      // All active users in tenant
      const { data: tenantUsers } = await supabase
        .from("core_users")
        .select("id, full_name")
        .eq("tenant_id", coreUser.tenant_id)
        .eq("is_active", true);

      const users = tenantUsers ?? [];
      const userMap = new Map(users.map((u) => [u.id, u.full_name]));
      const userIds = users.map((u) => u.id);

      // Today's date (JST)
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstNow = new Date(now.getTime() + jstOffset);
      const todayStr = jstNow.toISOString().slice(0, 10);
      const monthStart = `${todayStr.slice(0, 7)}-01`;

      // Today's clocks for all tenant users
      const { data: todayClocks } = await supabase
        .from("attn_clocks")
        .select("user_id, record_type, punched_at, is_offsite")
        .in("user_id", userIds)
        .gte("punched_at", `${todayStr}T00:00:00+09:00`)
        .lte("punched_at", `${todayStr}T23:59:59+09:00`)
        .order("punched_at", { ascending: false });

      // Determine who is currently working
      let workingCount = 0;
      let offsiteAlerts = 0;
      const lastByUser = new Map<string, string>();

      if (todayClocks) {
        for (const c of todayClocks) {
          if (!lastByUser.has(c.user_id)) {
            lastByUser.set(c.user_id, c.record_type);
          }
          if (c.is_offsite) offsiteAlerts++;
        }
        for (const [, lastType] of lastByUser) {
          if (lastType === "clock_in" || lastType === "break_end") {
            workingCount++;
          }
        }
      }

      // Monthly overtime
      const { data: monthlySummaries } = await supabase
        .from("attn_daily_summary")
        .select("overtime_min")
        .in("user_id", userIds)
        .gte("work_date", monthStart)
        .lte("work_date", todayStr);

      let monthlyOvertimeMin = 0;
      if (monthlySummaries) {
        for (const s of monthlySummaries) {
          monthlyOvertimeMin += s.overtime_min ?? 0;
        }
      }

      // Pending approvals (attendance + expense)
      const { count: attnPending } = await supabase
        .from("attn_overtime")
        .select("id", { count: "exact", head: true })
        .eq("status", "pre_detected");

      const { count: expPending } = await supabase
        .from("exp_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted");

      const pendingApprovals = (attnPending ?? 0) + (expPending ?? 0);

      setMetrics({
        pendingApprovals,
        workingCount,
        totalStaff: users.length,
        offsiteAlerts,
        monthlyOvertimeMin,
      });

      // Recent clocks for display
      const typeLabels: Record<string, string> = {
        clock_in: "出勤",
        clock_out: "退勤",
        break_start: "休憩開始",
        break_end: "休憩終了",
      };

      setRecentClocks(
        (todayClocks ?? []).slice(0, 10).map((c) => ({
          userName: userMap.get(c.user_id) ?? "不明",
          type: typeLabels[c.record_type] ?? c.record_type,
          time: new Date(c.punched_at).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          }),
          isOffsite: c.is_offsite,
        }))
      );

      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  const formatOT = (min: number) => {
    const h = Math.floor(min / 60);
    return `${h}h`;
  };

  const metricCards = [
    { label: "未承認", value: String(metrics.pendingApprovals), color: "" },
    {
      label: "出勤中",
      value: `${metrics.workingCount} / ${metrics.totalStaff}`,
      color: "",
    },
    {
      label: "場所アラート",
      value: String(metrics.offsiteAlerts),
      color: metrics.offsiteAlerts > 0 ? "text-red-400" : "",
      labelColor: metrics.offsiteAlerts > 0 ? "text-red-500" : "",
    },
    {
      label: "今月の残業合計",
      value: formatOT(metrics.monthlyOvertimeMin),
      color: "",
    },
  ];

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {metricCards.map((m) => (
          <GlassCard key={m.label} className="p-6">
            <p
              className={`text-[10px] tracking-widest mb-2 ${
                m.labelColor || "text-zinc-500"
              }`}
            >
              {m.label}
            </p>
            <p className={`text-3xl font-light ${m.color}`}>{m.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Recent clocks */}
      <h3 className="text-sm text-zinc-500 tracking-widest mb-4">
        本日の打刻
      </h3>
      {recentClocks.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-zinc-500 text-sm">本日の打刻データはありません</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full admin-table text-left text-sm">
            <thead>
              <tr>
                <th>氏名</th>
                <th>時刻</th>
                <th>種別</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {recentClocks.map((item, i) => (
                <tr key={i}>
                  <td>{item.userName}</td>
                  <td>{item.time}</td>
                  <td>{item.type}</td>
                  <td>
                    {item.isOffsite ? (
                      <Badge variant="alert">場所相違</Badge>
                    ) : (
                      <Badge variant="success">正常</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </>
  );
}
