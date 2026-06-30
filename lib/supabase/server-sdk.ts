import type { AuthModeWithKey, SupabaseEnv } from "@supabase/server";

/**
 * Resolves @supabase/server environment variables for Next.js route handlers
 * and other non-Edge runtimes. Edge Functions receive these automatically.
 */
export function resolveServerEnv(): Partial<SupabaseEnv> {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? undefined;

  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    undefined;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    undefined;

  const jwksUrl = process.env.SUPABASE_JWKS_URL;

  return {
    url,
    publishableKeys: publishableKey ? { default: publishableKey } : {},
    secretKeys: secretKey ? { default: secretKey } : {},
    jwks: jwksUrl ? new URL(jwksUrl) : null,
  };
}

export type ServerAuthMode = AuthModeWithKey;

export { withSupabase, createSupabaseContext } from "@supabase/server";
export {
  verifyCredentials,
  createContextClient,
  createAdminClient,
} from "@supabase/server/core";
