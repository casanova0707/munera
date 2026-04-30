"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceType } from "@/types/database";

type WorkStatus = "off_duty" | "working" | "on_break";

interface TodayClock {
  id: string;
  record_type: AttendanceType;
  punched_at: string;
  is_offsite: boolean;
}

interface MonthlySummary {
  totalWorkMin: number;
  totalOvertimeMin: number;
  daysWorked: number;
}

interface AttendanceStatusState {
  status: WorkStatus;
  todayClocks: TodayClock[];
  monthlySummary: MonthlySummary;
  coreUserId: string | null;
  isLoading: boolean;
}

function deriveStatus(clocks: TodayClock[]): WorkStatus {
  if (clocks.length === 0) return "off_duty";
  const last = clocks[clocks.length - 1];
  switch (last.record_type) {
    case "clock_in":
    case "break_end":
      return "working";
    case "break_start":
      return "on_break";
    case "clock_out":
      return "off_duty";
    default:
      return "off_duty";
  }
}

export function useAttendanceStatus() {
  const [state, setState] = useState<AttendanceStatusState>({
    status: "off_duty",
    todayClocks: [],
    monthlySummary: { totalWorkMin: 0, totalOvertimeMin: 0, daysWorked: 0 },
    coreUserId: null,
    isLoading: true,
  });

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Get core user id
    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Today's clocks (JST)
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = jstNow.toISOString().slice(0, 10);
    const dayStart = `${todayStr}T00:00:00+09:00`;
    const dayEnd = `${todayStr}T23:59:59+09:00`;

    const { data: clocks } = await supabase
      .from("attn_clocks")
      .select("id, record_type, punched_at, is_offsite")
      .eq("user_id", coreUser.id)
      .gte("punched_at", dayStart)
      .lte("punched_at", dayEnd)
      .order("punched_at", { ascending: true });

    const todayClocks = (clocks ?? []) as TodayClock[];

    // Monthly summary
    const monthStart = `${todayStr.slice(0, 7)}-01`;
    const { data: summaries } = await supabase
      .from("attn_daily_summary")
      .select("total_work_min, overtime_min")
      .eq("user_id", coreUser.id)
      .gte("work_date", monthStart)
      .lte("work_date", todayStr);

    const monthlySummary: MonthlySummary = {
      totalWorkMin: 0,
      totalOvertimeMin: 0,
      daysWorked: 0,
    };
    if (summaries) {
      for (const s of summaries) {
        monthlySummary.totalWorkMin += s.total_work_min ?? 0;
        monthlySummary.totalOvertimeMin += s.overtime_min ?? 0;
        monthlySummary.daysWorked++;
      }
    }

    setState({
      status: deriveStatus(todayClocks),
      todayClocks,
      monthlySummary,
      coreUserId: coreUser.id,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
