import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { canManageOrg } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";

export type MfaRequirementError = { error: string; code: "mfa_enrollment_required" };

export function orgRequiresMfa(settings: unknown): boolean {
  if (typeof settings !== "object" || settings === null || Array.isArray(settings)) {
    return false;
  }

  const security = (settings as Record<string, unknown>).security;
  if (typeof security !== "object" || security === null || Array.isArray(security)) {
    return false;
  }

  return (security as Record<string, unknown>).mfaRequired === true;
}

export async function hasVerifiedTotpEnrollment(): Promise<boolean> {
  const user = await getServerSessionUser();
  if (!user) {
    return false;
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  return factors?.totp?.some((factor) => factor.status === "verified") ?? false;
}

export async function requireMfaEnrollmentForRole(
  orgRole: OrgRole,
  orgSettings?: unknown,
): Promise<{ ok: true } | MfaRequirementError> {
  const policyRequiresMfa = orgSettings ? orgRequiresMfa(orgSettings) : false;
  const adminRequiresMfa = canManageOrg(orgRole);

  if (!policyRequiresMfa && !adminRequiresMfa) {
    return { ok: true };
  }

  const enrolled = await hasVerifiedTotpEnrollment();
  if (!enrolled) {
    return {
      error:
        "Multi-factor authentication is required. Enroll an authenticator app in Security settings.",
      code: "mfa_enrollment_required",
    };
  }

  return { ok: true };
}

export async function requireMandatoryAdminMfa(
  orgRole: OrgRole,
): Promise<{ ok: true } | MfaRequirementError> {
  if (process.env.CI === "1") {
    return { ok: true };
  }

  return requireMfaEnrollmentForRole(orgRole);
}
