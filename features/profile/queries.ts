import { getServerSessionUser } from "@/lib/supabase/server";
import {
  buildFullName,
  parseNameFromMetadata,
  resolveDisplayName,
} from "@/lib/users/display-name";

export interface UserProfile {
  userId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getServerSessionUser();
  if (!user) {
    return null;
  }

  const { firstName, lastName } = parseNameFromMetadata(user.user_metadata);

  return {
    userId: user.id,
    email: user.email ?? null,
    firstName,
    lastName,
    displayName: resolveDisplayName({
      userId: user.id,
      email: user.email,
      userMetadata: user.user_metadata,
    }),
  };
}

export function buildProfileMetadata(firstName: string, lastName: string) {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  return {
    first_name: trimmedFirst,
    last_name: trimmedLast,
    full_name: buildFullName(trimmedFirst, trimmedLast),
  };
}
