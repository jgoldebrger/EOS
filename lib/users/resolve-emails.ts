import { createAdminClient } from "@/lib/supabase/admin";
import { formatOwnerLabel } from "@/features/scorecard/utils";

export interface ResolvedUser {
  userId: string;
  email: string | null;
  displayName: string;
}

export async function resolveUserEmails(
  userIds: string[],
): Promise<Map<string, ResolvedUser>> {
  const unique = [...new Set(userIds)];
  const result = new Map<string, ResolvedUser>();

  if (unique.length === 0) {
    return result;
  }

  const admin = createAdminClient();

  await Promise.all(
    unique.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      const email = error || !data.user ? null : (data.user.email ?? null);
      result.set(userId, {
        userId,
        email,
        displayName: formatOwnerLabel(userId, email),
      });
    }),
  );

  return result;
}
