"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { formatWorkTime } from "@/lib/attendance/calculator";
import { createClient } from "@/lib/supabase/client";

interface DayRecord {
  work_date: string;
  first_clock_in: string | null;
  last_clock_out: string | null;
  total_work_min: number | null;
  overtime_min: number;
  is_late: boolean;
}

export default function AttendanceHistoryPage() {
  const [history, setHistory] = useState<DayRecord[]>([]);
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
        .select("id")
        .eq("supabase_auth_id", user.id)
        .single();

      if (!coreUser) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("attn_daily_summary")
        .select(
          "work_date, first_clock_in, last_clock_out, total_work_min, overtime_min, is_late"
        )
        .eq("user_id", coreUser.id)
        .order("work_date", { ascending: false })
        .limit(30);

      setHistory((data ?? []) as DayRecord[]);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  const formatTime = (iso: string | null) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[d.getDay()];
    return `${month}.${day} (${weekday})`;
  };

  return (
    <>
      <h2 className="text-2xl font-light mb-8">出退勤履歴</h2>

      {history.length === 0 ? (
        <EmptyState message="打刻データがありません" />
      ) : (
        <div className="space-y-3">
          {history.map((day) => (
            <GlassCard key={day.work_date} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{formatDate(day.work_date)}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatTime(day.first_clock_in)} → {formatTime(day.last_clock_out)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {day.total_work_min != null
                      ? formatWorkTime(day.total_work_min)
                      : "--"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {day.is_late && <Badge variant="alert">遅刻</Badge>}
                    {day.overtime_min > 0 && (
                      <Badge variant="pending">{day.overtime_min}m OT</Badge>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  );
}
