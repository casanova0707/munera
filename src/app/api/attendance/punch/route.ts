import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { punchSchema } from "@/lib/validators";
import { findNearestWorkplace } from "@/lib/gps/validation";
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

    const body = await request.json();
    const parsed = punchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get core user
    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id, tenant_id")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { record_type, latitude, longitude, offsite_reason } = parsed.data;

    // Check workplace geofence
    let workplaceId: string | null = null;
    let isOffsite = false;
    let nearestDistance: number | undefined;

    if (latitude !== undefined && longitude !== undefined) {
      const { data: workplaces } = await supabase
        .from("core_workplaces")
        .select("id, name, latitude, longitude, radius_meters")
        .eq("tenant_id", coreUser.tenant_id)
        .eq("is_active", true);

      if (workplaces && workplaces.length > 0) {
        const nearest = findNearestWorkplace(latitude, longitude, workplaces);
        if (nearest) {
          workplaceId = nearest.workplace.id;
          isOffsite = !nearest.isWithin;
          nearestDistance = nearest.distance;
        }
      }
    }

    // If offsite, require reason
    if (isOffsite && !offsite_reason) {
      return NextResponse.json(
        {
          error: "offsite_reason_required",
          distance: nearestDistance,
        },
        { status: 422 }
      );
    }

    // Insert clock record
    const { data: clock, error: insertError } = await supabase
      .from("attn_clocks")
      .insert({
        user_id: coreUser.id,
        record_type,
        latitude,
        longitude,
        workplace_id: workplaceId,
        is_offsite: isOffsite,
        offsite_reason: isOffsite ? offsite_reason : null,
        device_info: {
          userAgent: request.headers.get("user-agent"),
        },
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Auto-generate daily summary on clock_out
    if (record_type === "clock_out") {
      try {
        const now = new Date();
        const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const workDate = jstDate.toISOString().slice(0, 10);
        const dayStart = `${workDate}T00:00:00+09:00`;
        const dayEnd = `${workDate}T23:59:59+09:00`;

        const { data: dayClocks } = await supabase
          .from("attn_clocks")
          .select("*")
          .eq("user_id", coreUser.id)
          .gte("punched_at", dayStart)
          .lte("punched_at", dayEnd)
          .order("punched_at", { ascending: true });

        if (dayClocks && dayClocks.length > 0) {
          // Get user's shift
          const { data: userShift } = await supabase
            .from("attn_user_shifts")
            .select("shift_id")
            .eq("user_id", coreUser.id)
            .lte("start_date", workDate)
            .or(`end_date.gte.${workDate},end_date.is.null`)
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

          const summary = calculateDailySummary(
            dayClocks as AttnClock[],
            shift
          );

          await supabase.from("attn_daily_summary").upsert(
            {
              user_id: coreUser.id,
              work_date: workDate,
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
          );
        }
      } catch (summaryErr) {
        console.error("Auto-summary failed:", summaryErr);
        // Don't fail the punch — summary is secondary
      }
    }

    return NextResponse.json({
      success: true,
      clock,
      isOffsite,
      distance: nearestDistance,
    });
  } catch (err) {
    console.error("Punch error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
