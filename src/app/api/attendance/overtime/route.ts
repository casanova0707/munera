import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id, role")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser || !["sv", "admin"].includes(coreUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { overtime_id, action } = body as {
      overtime_id: string;
      action: "approved" | "rejected";
    };

    if (!overtime_id || !["approved", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("attn_overtime")
      .update({
        status: action,
        approved_by: coreUser.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", overtime_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Overtime approve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
