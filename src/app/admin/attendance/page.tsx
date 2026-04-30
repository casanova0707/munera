"use client";

import { useState, useEffect, useCallback } from "react";
import { DataTable } from "@/components/shared/data-table";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { createClient } from "@/lib/supabase/client";
import { formatWorkTime } from "@/lib/attendance/calculator";

interface AttendanceRow extends Record<string, unknown> {
  userName: string;
  date: string;
  inTime: string;
  outTime: string;
  workTime: string;
  status: string;
}

const columns = [
  { key: "userName", header: "氏名" },
  { key: "date", header: "日付" },
  { key: "inTime", header: "出勤" },
  { key: "outTime", header: "退勤" },
  { key: "workTime", header: "稼働" },
  {
    key: "status",
    header: "状態",
    render: (row: Record<string, unknown>) => {
      const s = row.status as string;
      const variant =
        s === "遅刻" || s === "場所相違"
          ? "alert"
          : s === "残業"
          ? "pending"
          : "success";
      const label = s || "正常";
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
];

export default function AdminAttendancePage() {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  )
    .toISOString()
    .split("T")[0];
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<AttendanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Get tenant for this admin
    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id, tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser) {
      setIsLoading(false);
      return;
    }

    // Get all users in tenant
    const { data: tenantUsers } = await supabase
      .from("core_users")
      .select("id, full_name")
      .eq("tenant_id", coreUser.tenant_id)
      .eq("is_active", true);

    if (!tenantUsers || tenantUsers.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    const userIds = tenantUsers.map((u) => u.id);
    const userMap = new Map(tenantUsers.map((u) => [u.id, u.full_name]));

    // Get daily summaries for date range
    const { data: summaries } = await supabase
      .from("attn_daily_summary")
      .select("*")
      .in("user_id", userIds)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false });

    // Also get today's clocks for users without summaries (real-time view)
    const { data: todayClocks } = await supabase
      .from("attn_clocks")
      .select("user_id, record_type, punched_at, is_offsite")
      .in("user_id", userIds)
      .gte("punched_at", `${from}T00:00:00+09:00`)
      .lte("punched_at", `${to}T23:59:59+09:00`)
      .order("punched_at", { ascending: true });

    const rows: AttendanceRow[] = [];

    // First add summary-based rows
    const summarizedKeys = new Set<string>();
    if (summaries) {
      for (const s of summaries) {
        const key = `${s.user_id}_${s.work_date}`;
        summarizedKeys.add(key);

        const formatTime = (iso: string | null) => {
          if (!iso) return "--:--";
          return new Date(iso).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          });
        };

        let status = "正常";
        if (s.is_late) status = "遅刻";
        else if (s.overtime_min > 0) status = "残業";

        rows.push({
          userName: userMap.get(s.user_id) ?? "不明",
          date: s.work_date,
          inTime: formatTime(s.first_clock_in),
          outTime: formatTime(s.last_clock_out),
          workTime:
            s.total_work_min != null
              ? formatWorkTime(s.total_work_min)
              : "--",
          status,
        });
      }
    }

    // Add real-time clock data for users/dates without summaries
    if (todayClocks) {
      const clocksByUserDate = new Map<
        string,
        { inTime: string | null; outTime: string | null; isOffsite: boolean }
      >();
      for (const c of todayClocks) {
        const dateStr = new Date(c.punched_at)
          .toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
        const key = `${c.user_id}_${dateStr}`;
        if (summarizedKeys.has(key)) continue;

        if (!clocksByUserDate.has(key)) {
          clocksByUserDate.set(key, {
            inTime: null,
            outTime: null,
            isOffsite: false,
          });
        }
        const entry = clocksByUserDate.get(key)!;
        if (c.record_type === "clock_in" && !entry.inTime) {
          entry.inTime = c.punched_at;
        }
        if (c.record_type === "clock_out") {
          entry.outTime = c.punched_at;
        }
        if (c.is_offsite) entry.isOffsite = true;
      }

      for (const [key, val] of clocksByUserDate) {
        const [userId, dateStr] = key.split("_");
        const formatTime = (iso: string | null) => {
          if (!iso) return "--:--";
          return new Date(iso).toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo",
          });
        };

        let workTime = "--";
        if (val.inTime) {
          const start = new Date(val.inTime).getTime();
          const end = val.outTime
            ? new Date(val.outTime).getTime()
            : Date.now();
          workTime = formatWorkTime(Math.floor((end - start) / 60000));
        }

        let status = val.outTime ? "正常" : "勤務中";
        if (val.isOffsite) status = "場所相違";

        rows.push({
          userName: userMap.get(userId) ?? "不明",
          date: dateStr,
          inTime: formatTime(val.inTime),
          outTime: formatTime(val.outTime),
          workTime,
          status,
        });
      }
    }

    setData(rows);
    setIsLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-sm text-zinc-500 uppercase tracking-widest">
          勤怠記録
        </h3>
        <div className="flex items-center gap-4">
          <DateRangePicker
            from={from}
            to={to}
            onChange={(f, t) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={data} />
    </>
  );
}
