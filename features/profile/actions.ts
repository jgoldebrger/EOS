"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { toSafeAuthError } from "@/lib/auth/errors";
import { buildProfileMetadata } from "@/features/profile/queries";
import { updateProfileSchema } from "@/features/profile/schema";

export type UpdateProfileResult =
  | { success: true }
  | { success: false; error: string };

function revalidateOrgPaths(orgSlug: string) {
  after(() => {
    revalidatePath(`/org/${orgSlug}`, "layout");
  });
}

export async function updateProfile(input: unknown): Promise<UpdateProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid profile details",
    };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { orgSlug, firstName, lastName } = parsed.data;
  const supabase = await createClient();
  const metadata = buildProfileMetadata(firstName, lastName);

  const { error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) {
    return { success: false, error: toSafeAuthError(error) };
  }

  revalidateOrgPaths(orgSlug);
  revalidatePath(`/org/${orgSlug}/profile`);

  return { success: true };
}

export async function updateNotificationPreferences(
  input: unknown,
): Promise<UpdateProfileResult> {
  const { updateNotificationPreferencesSchema } = await import("@/features/profile/schema");
  const parsed = updateNotificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid preferences" };
  }

  const user = await getServerSessionUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: {
      notification_preferences: {
        emailAssignments: parsed.data.emailAssignments,
        emailL10Recap: parsed.data.emailL10Recap,
        emailWeeklyDigest: parsed.data.emailWeeklyDigest,
      },
    },
  });

  if (error) {
    return { success: false, error: toSafeAuthError(error) };
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/profile`);
  return { success: true };
}
