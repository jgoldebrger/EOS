import { requirePrivilegedSession } from "@/lib/auth/privileged-session";

/** Returns true when OAuth/SSO sign-in must complete an MFA step-up challenge. */
export async function oauthCallbackNeedsMfaStepUp(): Promise<boolean> {
  const privileged = await requirePrivilegedSession();
  return "error" in privileged;
}

export async function getOAuthCallbackMfaRedirect(
  origin: string,
  next: string,
): Promise<string | null> {
  const needsStepUp = await oauthCallbackNeedsMfaStepUp();
  if (!needsStepUp) {
    return null;
  }

  const params = new URLSearchParams({ next });
  return `${origin}/auth/mfa?${params.toString()}`;
}
