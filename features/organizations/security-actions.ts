"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getActionActor,
  isActionActorError,
  requireAdminActor,
} from "@/lib/auth/get-action-actor";
import { orgRequiresMfa } from "@/lib/auth/mfa-requirements";
import type { Json } from "@/types/database";

const updateOrgSecuritySettingsSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  mfaRequired: z.boolean(),
});

export type UpdateOrgSecuritySettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function updateOrgSecuritySettings(
  input: unknown,
): Promise<UpdateOrgSecuritySettingsResult> {
  const parsed = updateOrgSecuritySettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid security settings" };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { data: org, error: orgError } = await actor.supabase
    .from("organizations")
    .select("settings")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return { success: false, error: "Organization not found" };
  }

  const currentSettings =
    typeof org.settings === "object" && org.settings !== null && !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};

  const currentSecurity =
    typeof currentSettings.security === "object" &&
    currentSettings.security !== null &&
    !Array.isArray(currentSettings.security)
      ? (currentSettings.security as Record<string, unknown>)
      : {};

  const nextSettings = {
    ...currentSettings,
    security: {
      ...currentSecurity,
      mfaRequired: parsed.data.mfaRequired,
    },
  } satisfies Record<string, unknown>;

  const { error: updateError } = await actor.supabase
    .from("organizations")
    .update({ settings: nextSettings as Json })
    .eq("id", parsed.data.organizationId);

  if (updateError) {
    return { success: false, error: "Unable to save security settings" };
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security`);
  return { success: true };
}

export async function getOrgSecuritySettings(organizationId: string) {
  const actor = await getActionActor(organizationId);
  if (isActionActorError(actor)) {
    return { mfaRequired: false };
  }

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();

  return {
    mfaRequired: orgRequiresMfa(org?.settings),
  };
}
