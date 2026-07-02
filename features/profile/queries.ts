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
  notificationPreferences: {
    emailAssignments: boolean;
    emailL10Recap: boolean;
    emailWeeklyDigest: boolean;
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const user = await getServerSessionUser();
  if (!user) {
    return null;
  }

  const { firstName, lastName } = parseNameFromMetadata(user.user_metadata);
  const prefs =
    typeof user.user_metadata?.notification_preferences === "object" &&
    user.user_metadata.notification_preferences !== null
      ? (user.user_metadata.notification_preferences as Record<string, unknown>)
      : {};

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
    notificationPreferences: {
      emailAssignments: prefs.emailAssignments === true,
      emailL10Recap: prefs.emailL10Recap === true,
      emailWeeklyDigest: prefs.emailWeeklyDigest === true,
    },
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
