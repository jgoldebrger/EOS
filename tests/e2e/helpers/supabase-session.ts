import type { BrowserContext } from "@playwright/test";

interface GoTrueSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: Record<string, unknown>;
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !apiKey) {
    throw new Error("Missing Supabase URL or publishable key for E2E auth");
  }

  return { url, apiKey };
}

function getAuthCookieName(supabaseUrl: string): string {
  const hostname = new URL(supabaseUrl).hostname;
  const ref = hostname === "127.0.0.1" || hostname === "localhost" ? "127" : hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

export async function clearSupabaseAuthCookies(context: BrowserContext): Promise<void> {
  const { url } = getSupabaseEnv();
  const cookieName = getAuthCookieName(url);
  await context.clearCookies({ name: cookieName, domain: "localhost" });
}

export async function injectSupabaseSession(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<void> {
  await clearSupabaseAuthCookies(context);

  const { url, apiKey } = getSupabaseEnv();

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GoTrue sign-in failed (${response.status}): ${detail}`);
  }

  const session = (await response.json()) as GoTrueSession;
  const cookieName = getAuthCookieName(url);
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type ?? "bearer",
    user: session.user,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: payload,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
