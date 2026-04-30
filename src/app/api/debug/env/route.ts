import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(not set)";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "(not set)";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "(not set)";

  return NextResponse.json({
    SUPABASE_URL: url,
    ANON_KEY_length: key.length,
    ANON_KEY_start: key.substring(0, 20),
    ANON_KEY_end: key.substring(key.length - 10),
    APP_URL: appUrl,
  });
}
