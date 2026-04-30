import { NextResponse, type NextRequest } from "next/server";
import { exchangeLineCode, getLineProfile } from "@/lib/line/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    );
  }

  try {
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
    const { accessToken } = await exchangeLineCode(code, callbackUrl);
    const profile = await getLineProfile(accessToken);

    const adminSupabase = createAdminClient();

    // Check if user exists with this LINE ID
    const { data: existingUser } = await adminSupabase
      .from("core_users")
      .select("supabase_auth_id, email")
      .eq("line_user_id", profile.userId)
      .single();

    let authUserId: string;

    if (existingUser) {
      // User exists - sign them in
      authUserId = existingUser.supabase_auth_id;
    } else {
      // Create new auth user
      const tempEmail = `line_${profile.userId}@munera.local`;
      const { data: newAuthUser, error: createError } =
        await adminSupabase.auth.admin.createUser({
          email: tempEmail,
          email_confirm: true,
          user_metadata: {
            line_user_id: profile.userId,
            display_name: profile.displayName,
          },
        });

      if (createError || !newAuthUser.user) {
        throw new Error("Failed to create auth user");
      }

      authUserId = newAuthUser.user.id;

      // Create core_user record
      // Note: tenant_id should be configured during onboarding
      // For now, use a default tenant or require pre-registration
      await adminSupabase.from("core_users").insert({
        supabase_auth_id: authUserId,
        tenant_id: process.env.DEFAULT_TENANT_ID,
        full_name: profile.displayName,
        line_user_id: profile.userId,
        avatar_url: profile.pictureUrl,
        role: "staff",
        auth_method: "line",
      });
    }

    // Create a session for the user
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: existingUser?.email ?? `line_${profile.userId}@munera.local`,
      password: profile.userId, // LINE userId as password for LINE users
    });

    if (signInError) {
      // Set password if not yet set
      await adminSupabase.auth.admin.updateUserById(authUserId, {
        password: profile.userId,
      });
      await supabase.auth.signInWithPassword({
        email: `line_${profile.userId}@munera.local`,
        password: profile.userId,
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/staff/dashboard`
    );
  } catch (err) {
    console.error("LINE auth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=auth_failed`
    );
  }
}
