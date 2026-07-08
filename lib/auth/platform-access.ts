/** Public email/password signup is disabled in production (invite-only). */
export function isPublicSignupEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.ALLOW_PUBLIC_SIGNUP === "true";
}

/** Self-service org creation is disabled in production (invitation-only onboarding). */
export function isSelfServiceOrgCreationEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.ALLOW_SELF_SERVICE_ORG === "true";
}
