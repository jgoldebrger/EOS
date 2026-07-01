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
