import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const fileEnv = loadEnvFile(".env.production.local");
const env = { ...process.env, ...fileEnv };

const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const email = env.E2E_ADMIN_EMAIL ?? "admin@demo.local";
const password = env.E2E_ADMIN_PASSWORD ?? "E2eTestPassword1!";
const demoOrgId = "22222222-2222-2222-2222-222222222222";
const otherOrgId = "33333333-3333-3333-3333-333333333333";

if (!url || !publishableKey) {
  console.error("Missing Supabase URL or publishable key for JWT verification");
  process.exit(1);
}

const authClient = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
  email,
  password,
});

if (signInError || !signInData.session?.access_token) {
  console.error("JWT sign-in failed:", signInError);
  process.exit(1);
}

const userClient = createClient(url, publishableKey, {
  global: {
    headers: {
      Authorization: `Bearer ${signInData.session.access_token}`,
    },
  },
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: ownMembership, error: ownError } = await userClient
  .from("organization_members")
  .select("org_role")
  .eq("organization_id", demoOrgId)
  .eq("user_id", signInData.user.id)
  .maybeSingle();

const { data: foreignIssues, error: foreignError } = await userClient
  .from("issues")
  .select("id")
  .eq("organization_id", otherOrgId)
  .limit(1);

const { error: getUserError } = await authClient.auth.getUser(signInData.session.access_token);

console.log("JWT / RLS verification:", {
  userId: signInData.user.id,
  ownMembership: ownMembership?.org_role ?? null,
  ownError: ownError?.message ?? null,
  foreignIssueCount: foreignIssues?.length ?? 0,
  foreignError: foreignError?.message ?? null,
  getUserOk: !getUserError,
  jwksUrl: env.SUPABASE_JWKS_URL ?? null,
});

if (ownError || !ownMembership) {
  console.error("User JWT cannot read own organization membership (RLS/JWT broken)");
  process.exit(1);
}

if (getUserError) {
  console.error("auth.getUser() failed with session access token:", getUserError.message);
  process.exit(1);
}

if ((foreignIssues ?? []).length > 0) {
  console.error("Cross-tenant read succeeded — RLS may be misconfigured");
  process.exit(1);
}

console.log("JWT + RLS verification passed");
