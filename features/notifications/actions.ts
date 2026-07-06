"use server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import { canManageOrg } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";
import { z } from "zod";

const smokeTestSchema = z.object({
  organizationId: z.string().uuid(),
});

export type NotificationSmokeTestResult =
  | { success: true; sent: boolean; message?: string }
  | { success: false; error: string };

export async function sendNotificationSmokeTest(
  input: unknown,
): Promise<NotificationSmokeTestResult> {
  const parsed = smokeTestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "You must be signed in with an email address" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !canManageOrg(membership.org_role as OrgRole)) {
    return { success: false, error: "Admin access required" };
  }

  const supabaseUrl = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  if (!supabaseUrl || !secretKey) {
    return {
      success: false,
      error: "SUPABASE_SECRET_KEY is not configured on this deployment",
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: user.email,
      subject: "EOS notification smoke test",
      body: "If you received this email, production notifications are working.",
      type: "assignment",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      success: false,
      error: `Edge function failed (${response.status}): ${detail || "unknown error"}`,
    };
  }

  const result = (await response.json()) as { sent?: boolean; messageId?: string };
  return {
    success: true,
    sent: result.sent === true,
    message: result.sent
      ? "Email sent via Resend."
      : "Function ran but email was not sent — check Resend secrets and sender domain.",
  };
}

export async function getNotificationEnvStatus(): Promise<{
  hasSecretKey: boolean;
  supabaseUrl: string | null;
}> {
  return {
    hasSecretKey: Boolean(getSupabaseSecretKey()),
    supabaseUrl: getSupabaseUrl(),
  };
}
