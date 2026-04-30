import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validators";

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
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: coreUser } = await supabase
      .from("core_users")
      .select("id")
      .eq("supabase_auth_id", user.id)
      .single();

    if (!coreUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: expense, error: insertError } = await supabase
      .from("exp_applications")
      .insert({
        user_id: coreUser.id,
        category_id: parsed.data.category_id,
        expense_date: parsed.data.expense_date,
        amount: parsed.data.amount,
        description: parsed.data.description,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Handle receipt image if provided
    if (body.receiptImage) {
      const base64Data = body.receiptImage.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const buffer = Buffer.from(base64Data, "base64");
      const filePath = `receipts/${coreUser.id}/${expense.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, buffer, { contentType: "image/jpeg" });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("receipts")
          .getPublicUrl(filePath);

        await supabase.from("exp_receipt_images").insert({
          application_id: expense.id,
          image_url: urlData.publicUrl,
        });
      }
    }

    return NextResponse.json({ success: true, expense });
  } catch (err) {
    console.error("Expense submit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
