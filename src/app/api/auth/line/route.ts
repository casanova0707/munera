import { NextResponse } from "next/server";
import { generateLineLoginUrl } from "@/lib/line/auth";

export async function GET() {
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  const loginUrl = generateLineLoginUrl(callbackUrl);
  return NextResponse.redirect(loginUrl);
}
