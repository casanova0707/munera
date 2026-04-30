"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";

interface AuditRow extends Record<string, unknown> {
  id: string;
  time: string;
  actor: string;
  table: string;
  action: string;
  detail: string;
}

const actionVariant: Record<string, "success" | "pending" | "alert"> = {
  INSERT: "success",
  UPDATE: "pending",
  DELETE: "alert",
};

const columns = [
  { key: "time", header: "日時" },
  { key: "actor", header: "操作者" },
  { key: "table", header: "テーブル" },
  {
    key: "action",
    header: "操作",
    render: (row: Record<string, unknown>) => (
      <Badge variant={actionVariant[row.action as string] ?? "default"}>
        {row.action as string}
      </Badge>
    ),
  },
  { key: "detail", header: "詳細" },
];

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: logs } = await supabase
        .from("sys_audit_logs")
        .select("id, created_at, actor_id, table_name, action, old_data, new_data")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!logs || logs.length === 0) {
        setData([]);
        setIsLoading(false);
        return;
      }

      // Get user names for actors
      const userIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))];
      const userMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("core_users")
          .select("id, full_name")
          .in("id", userIds);
        if (users) {
          for (const u of users) {
            userMap.set(u.id, u.full_name);
          }
        }
      }

      const rows: AuditRow[] = logs.map((l) => ({
        id: l.id,
        time: new Date(l.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
        actor: l.actor_id ? (userMap.get(l.actor_id) ?? "不明") : "システム",
        table: l.table_name,
        action: l.action,
        detail: summarizeChanges(l.action, l.old_data, l.new_data),
      }));

      setData(rows);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <h3 className="text-sm text-zinc-500 uppercase tracking-widest mb-8">
        監査ログ
      </h3>
      {data.length === 0 ? (
        <EmptyState message="監査ログがありません" />
      ) : (
        <DataTable columns={columns} data={data} />
      )}
    </>
  );
}

function summarizeChanges(
  action: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): string {
  if (action === "INSERT" && newData) {
    const keys = Object.keys(newData).slice(0, 3).join(", ");
    return `新規作成 (${keys})`;
  }
  if (action === "DELETE") {
    return "削除";
  }
  if (action === "UPDATE" && oldData && newData) {
    const changes: string[] = [];
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push(key);
      }
    }
    return changes.length > 0 ? `変更: ${changes.slice(0, 3).join(", ")}` : "変更";
  }
  return action;
}
