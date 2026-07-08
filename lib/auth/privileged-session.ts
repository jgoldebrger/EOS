import { createClient, getServerSessionUser } from "@/lib/supabase/server";

export type PrivilegedSessionError = { error: string };

/**
 * Sensitive owner/admin mutations require MFA step-up when the user has enrolled TOTP.
 * Does not block users who have not enrolled yet.
 */
export async function requirePrivilegedSession(): Promise<
  { ok: true; userId: string } | PrivilegedSessionError
> {
  const user = await getServerSessionUser();
  if (!user) {
    return { error: "You must be signed in" };
  }

  const supabase = await createClient();
  const [{ data: factorsData }, { data: aalData }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const hasVerifiedTotp =
    factorsData?.totp?.some((factor) => factor.status === "verified") ?? false;

  if (hasVerifiedTotp && aalData?.currentLevel !== "aal2") {
    return {
      error:
        "Multi-factor authentication is required for this action. Sign in again with your authenticator app.",
    };
  }

  return { ok: true, userId: user.id };
}
