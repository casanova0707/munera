import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateDailySummary } from "@/lib/attendance/calculator";
import type { AttnClock, AttnShift } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_id, work_date } = await request.json();

    // Get all clocks for the day
    const dayStart = `${work_date}T00:00:00`;
    const dayEnd = `${work_date}T23:59:59`;

    const { data: clocks } = await supabase
      .from("attn_clocks")
      .select("*")
      .eq("user_id", user_id)
      .gte("punched_at", dayStart)
      .lte("punched_at", dayEnd)
      .order("punched_at", { ascending: true });

    if (!clocks || clocks.length === 0) {
      return NextResponse.json({ message: "No clocks found" });
    }

    // Get user's shift for this date
    const { data: userShift } = await supabase
      .from("attn_user_shifts")
      .select("shift_id")
      .eq("user_id", user_id)
      .lte("start_date", work_date)
      .or(`end_date.gte.${work_date},end_date.is.null`)
      .single();

    let shift: AttnShift | null = null;
    if (userShift) {
      const { data: shiftData } = await supabase
        .from("attn_shifts")
        .select("*")
        .eq("id", userShift.shift_id)
        .single();
      shift = shiftData;
    }

    const summary = calculateDailySummary(clocks as AttnClock[], shift);

    // Upsert daily summary
    const { data: upserted, error: upsertError } = await supabase
      .from("attn_daily_summary")
      .upsert(
        {
          user_id,
          work_date,
          shift_id: userShift?.shift_id ?? null,
          first_clock_in: summary.firstClockIn,
          last_clock_out: summary.lastClockOut,
          total_work_min: summary.totalWorkMin,
          total_break_min: summary.totalBreakMin,
          overtime_min: summary.overtimeMin,
          is_late: summary.isLate,
          is_early_leave: summary.isEarlyLeave,
        },
        { onConflict: "user_id,work_date" }
      )
      .select()
      .single();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, summary: upserted });
  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
