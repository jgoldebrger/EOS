"use server";

import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  isActionActorError,
  requireAdminActor,
} from "@/lib/auth/get-action-actor";
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

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const user = actor.user;
  if (!user.email) {
    return { success: false, error: "You must be signed in with an email address" };
  }

  const supabaseUrl = getSupabaseUrl();
  const bearerToken =
    process.env.NOTIFICATIONS_CRON_SECRET ?? getSupabaseSecretKey();

  if (!supabaseUrl || !bearerToken) {
    return {
      success: false,
      error: "Notification secrets are not configured on this deployment",
    };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
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

export async function getNotificationEnvStatus(organizationId: string): Promise<
  | { success: true; hasSecretKey: boolean; supabaseUrl: string | null }
  | { success: false; error: string }
> {
  const actor = await requireAdminActor(organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  return {
    success: true,
    hasSecretKey: Boolean(getSupabaseSecretKey()),
    supabaseUrl: getSupabaseUrl(),
  };
}
