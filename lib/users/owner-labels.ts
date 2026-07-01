import { resolveDisplayName } from "@/lib/users/display-name";
import {
  resolveUserEmails,
  type ResolvedUser,
} from "@/lib/users/resolve-emails";

export function ownerLabelFromProfiles(
  profiles: Map<string, ResolvedUser>,
  userId: string,
): string {
  return (
    profiles.get(userId)?.displayName ??
    resolveDisplayName({ userId })
  );
}

export async function resolveOwnerProfiles(
  userIds: Array<string | null | undefined>,
): Promise<Map<string, ResolvedUser>> {
  const unique = [
    ...new Set(userIds.filter((id): id is string => Boolean(id))),
  ];
  return resolveUserEmails(unique);
}
