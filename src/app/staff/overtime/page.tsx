"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { OvertimeStatus } from "@/types/database";

interface OvertimeRow {
  id: string;
  work_date: string;
  detected_minutes: number;
  status: OvertimeStatus;
  reason: string | null;
}

export default function StaffOvertimePage() {
  const [data, setData] = useState<OvertimeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: coreUser } = await supabase
        .from("core_users")
        .select("id")
        .eq("supabase_auth_id", user.id)
        .single();
      if (!coreUser) { setIsLoading(false); return; }

      const { data: overtime } = await supabase
        .from("attn_overtime")
        .select("id, work_date, detected_minutes, status, reason")
        .eq("user_id", coreUser.id)
        .order("work_date", { ascending: false })
        .limit(30);

      setData((overtime ?? []) as OvertimeRow[]);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) return <LoadingSpinner />;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  };

  return (
    <>
      <h2 className="text-2xl font-light mb-8">残業一覧</h2>

      {data.length === 0 ? (
        <EmptyState message="残業データがありません" />
      ) : (
        <div className="space-y-3">
          {data.map((ot) => (
            <GlassCard key={ot.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-sm">{formatDate(ot.work_date)}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ot.reason ?? "理由未入力"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-orange-200">{ot.detected_minutes}min</p>
                  <div className="mt-1">
                    <StatusBadge status={ot.status} type="overtime" />
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
