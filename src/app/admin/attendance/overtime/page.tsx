"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { OvertimeStatus } from "@/types/database";

interface OvertimeRow extends Record<string, unknown> {
  id: string;
  name: string;
  date: string;
  minutes: number;
  reason: string;
  status: OvertimeStatus;
}

export default function AdminOvertimePage() {
  const { toast } = useToast();
  const [data, setData] = useState<OvertimeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: overtime } = await supabase
      .from("attn_overtime")
      .select("id, user_id, work_date, detected_minutes, status, reason")
      .order("work_date", { ascending: false })
      .limit(50);

    if (!overtime || overtime.length === 0) {
      setData([]);
      setIsLoading(false);
      return;
    }

    // Get user names
    const userIds = [...new Set(overtime.map((o) => o.user_id))];
    const { data: users } = await supabase
      .from("core_users")
      .select("id, full_name")
      .in("id", userIds);
    const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name]));

    const rows: OvertimeRow[] = overtime.map((o) => ({
      id: o.id,
      name: userMap.get(o.user_id) ?? "不明",
      date: o.work_date,
      minutes: o.detected_minutes,
      reason: o.reason ?? "-",
      status: o.status as OvertimeStatus,
    }));

    setData(rows);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (overtimeId: string, action: "approved" | "rejected") => {
    const res = await fetch("/api/attendance/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overtime_id: overtimeId, action }),
    });
    if (res.ok) {
      toast(action === "approved" ? "承認しました" : "却下しました", "success");
      await load();
    } else {
      toast("処理に失敗しました", "error");
    }
  };

  const columns = [
    { key: "name", header: "氏名" },
    { key: "date", header: "日付" },
    {
      key: "minutes",
      header: "時間",
      render: (row: Record<string, unknown>) => (
        <span className="text-orange-400">{row.minutes as number}m</span>
      ),
    },
    { key: "reason", header: "理由" },
    {
      key: "status",
      header: "状態",
      render: (row: Record<string, unknown>) => (
        <StatusBadge status={row.status as OvertimeStatus} type="overtime" />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row: Record<string, unknown>) =>
        (row.status as string) === "pre_detected" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAction(row.id as string, "approved")}
            >
              承認
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400"
              onClick={() => handleAction(row.id as string, "rejected")}
            >
              却下
            </Button>
          </div>
        ) : null,
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <h3 className="text-sm text-zinc-500 uppercase tracking-widest mb-8">
        残業承認キュー
      </h3>
      {data.length === 0 ? (
        <EmptyState message="残業データがありません" />
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </>
  );
}
