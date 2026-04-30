import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { expenseApprovalSchema } from "@/lib/validators";

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
    const parsed = expenseApprovalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id, role")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser || !["sv", "admin"].includes(coreUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { application_id, action, comment } = parsed.data;

    // Update expense status
    const { error: updateError } = await supabase
      .from("exp_applications")
      .update({ status: action })
      .eq("id", application_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log approval action
    await supabase.from("exp_approvals").insert({
      application_id,
      approver_id: coreUser.id,
      action,
      comment: comment || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Expense approve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
