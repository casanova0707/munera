import crypto from "crypto";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export function generateLineLoginUrl(redirectUri: string): string {
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINE_CHANNEL_ID!,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    nonce,
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLineCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; idToken: string }> {
  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINE_CHANNEL_ID!,
      client_secret: process.env.LINE_CHANNEL_SECRET!,
    }),
  });

  if (!res.ok) {
    throw new Error(`LINE token exchange failed: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
  };
}

export async function getLineProfile(accessToken: string): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
}> {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`LINE profile fetch failed: ${res.statusText}`);
  }

  return res.json();
}
