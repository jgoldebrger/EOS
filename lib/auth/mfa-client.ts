import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { toSafeAuthError } from "@/lib/auth/errors";

export type AppSupabaseClient = SupabaseClient<Database>;

export interface MfaFactorSummary {
  id: string;
  friendlyName: string | null;
  status: string;
}

type ListFactorsResult = Awaited<
  ReturnType<AppSupabaseClient["auth"]["mfa"]["listFactors"]>
>["data"];

function mapTotpFactor(
  factor: NonNullable<ListFactorsResult>["totp"][number],
): MfaFactorSummary {
  return {
    id: factor.id,
    status: factor.status,
    friendlyName: factor.friendly_name ?? null,
  };
}

export function pickVerifiedTotpFactor(
  factors: ListFactorsResult | null | undefined,
): MfaFactorSummary | null {
  const verified = factors?.totp?.find((factor) => factor.status === "verified");
  return verified ? mapTotpFactor(verified) : null;
}

export async function loadMfaStatus(supabase: AppSupabaseClient) {
  const [{ data: factors, error: factorsError }, { data: aal, error: aalError }] =
    await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

  if (factorsError) {
    return { error: toSafeAuthError(factorsError) } as const;
  }

  if (aalError) {
    return { error: toSafeAuthError(aalError) } as const;
  }

  const verifiedFactor = pickVerifiedTotpFactor(factors);
  const needsStepUp =
    Boolean(verifiedFactor) &&
    aal?.nextLevel === "aal2" &&
    aal.currentLevel !== "aal2";

  return {
    verifiedFactor,
    needsStepUp,
    currentLevel: aal?.currentLevel ?? null,
    nextLevel: aal?.nextLevel ?? null,
  } as const;
}

export async function challengeAndVerifyTotp(
  supabase: AppSupabaseClient,
  code: string,
  factorId?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) {
    return { success: false, error: "Enter the 6-digit code from your authenticator app." };
  }

  let resolvedFactorId = factorId;
  if (!resolvedFactorId) {
    const { data: factors, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      return { success: false, error: toSafeAuthError(error) };
    }

    const verified = pickVerifiedTotpFactor(factors);
    if (!verified) {
      return { success: false, error: "No authenticator is enrolled on this account." };
    }

    resolvedFactorId = verified.id;
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: resolvedFactorId,
  });

  if (challengeError || !challenge) {
    return {
      success: false,
      error: challengeError ? toSafeAuthError(challengeError) : "Could not start MFA challenge.",
    };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: resolvedFactorId,
    challengeId: challenge.id,
    code: trimmed,
  });

  if (verifyError) {
    return { success: false, error: toSafeAuthError(verifyError) };
  }

  return { success: true };
}

export async function enrollTotpFactor(supabase: AppSupabaseClient) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator app",
  });

  if (error || !data) {
    return {
      success: false as const,
      error: error ? toSafeAuthError(error) : "Could not start MFA enrollment.",
    };
  }

  return {
    success: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

export async function verifyNewTotpEnrollment(
  supabase: AppSupabaseClient,
  factorId: string,
  code: string,
) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });

  if (challengeError || !challenge) {
    return {
      success: false as const,
      error: challengeError
        ? toSafeAuthError(challengeError)
        : "Could not verify enrollment.",
    };
  }

  const trimmed = code.replace(/\s/g, "");
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  });

  if (verifyError) {
    return { success: false as const, error: toSafeAuthError(verifyError) };
  }

  return { success: true as const };
}

export async function unenrollTotpFactor(
  supabase: AppSupabaseClient,
  factorId: string,
) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return { success: false as const, error: toSafeAuthError(error) };
  }

  return { success: true as const };
}
