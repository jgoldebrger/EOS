import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveDisplayName } from "@/lib/users/display-name";

export interface ResolvedUser {
  userId: string;
  email: string | null;
  displayName: string;
}

export interface ResolveUserEmailsOptions {
  /** When set, only resolve user IDs that belong to this organization. */
  organizationId?: string;
}

async function filterOrgMemberIds(
  userIds: string[],
  organizationId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("user_id", userIds);

  return new Set((data ?? []).map((row) => row.user_id));
}

export async function resolveUserEmails(
  userIds: string[],
  options?: ResolveUserEmailsOptions,
): Promise<Map<string, ResolvedUser>> {
  const unique = [...new Set(userIds)];
  const result = new Map<string, ResolvedUser>();

  if (unique.length === 0) {
    return result;
  }

  let allowedIds = unique;
  if (options?.organizationId) {
    const memberIds = await filterOrgMemberIds(unique, options.organizationId);
    allowedIds = unique.filter((userId) => memberIds.has(userId));
  }

  if (allowedIds.length === 0) {
    return result;
  }

  const admin = createAdminClient();

  await Promise.all(
    allowedIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      const email = error || !data.user ? null : (data.user.email ?? null);
      const userMetadata = error || !data.user ? null : data.user.user_metadata;
      result.set(userId, {
        userId,
        email,
        displayName: resolveDisplayName({ userId, email, userMetadata }),
      });
    }),
  );

  return result;
}
