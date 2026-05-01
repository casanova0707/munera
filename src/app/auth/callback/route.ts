import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_failed`
    );
  }

  // Get user and determine redirect destination
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  let { data: coreUser } = await supabase
    .from("core_users")
    .select("id, role")
    .eq("supabase_auth_id", user.id)
    .single();

  // If not found by auth ID, try matching by email and link the account
  if (!coreUser && user.email) {
    const adminClient = createAdminClient();
    const { data: matchedByEmail } = await adminClient
      .from("core_users")
      .select("id, role")
      .eq("email", user.email)
      .single();

    if (matchedByEmail) {
      // Link this Supabase auth ID to the pre-registered core_user (bypass RLS)
      await adminClient
        .from("core_users")
        .update({ supabase_auth_id: user.id })
        .eq("id", matchedByEmail.id);
      coreUser = matchedByEmail;
    }
  }

  let dest = "/login?error=no_account";
  if (coreUser) {
    dest =
      coreUser.role === "admin" || coreUser.role === "sv"
        ? "/admin/dashboard"
        : "/staff/dashboard";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${dest}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${dest}`);
  } else {
    return NextResponse.redirect(`${origin}${dest}`);
  }
}
