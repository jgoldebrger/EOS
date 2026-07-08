import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";

export type NotificationType =
  | "assignment"
  | "l10_recap"
  | "l10_reminder"
  | "cascade"
  | "people_review_reminder"
  | "scorecard_digest";

export interface QueueNotificationInput {
  userId: string;
  type: NotificationType;
  subject: string;
  body: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  emailAssignments: boolean;
  emailL10Recap: boolean;
  emailWeeklyDigest: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailAssignments: true,
  emailL10Recap: true,
  emailWeeklyDigest: false,
};

export function parseNotificationPreferences(
  metadata: Record<string, unknown> | undefined,
): NotificationPreferences {
  const raw = metadata?.notification_preferences;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return DEFAULT_PREFERENCES;
  }

  const prefs = raw as Record<string, unknown>;
  return {
    emailAssignments:
      typeof prefs.emailAssignments === "boolean"
        ? prefs.emailAssignments
        : DEFAULT_PREFERENCES.emailAssignments,
    emailL10Recap:
      typeof prefs.emailL10Recap === "boolean"
        ? prefs.emailL10Recap
        : DEFAULT_PREFERENCES.emailL10Recap,
    emailWeeklyDigest:
      typeof prefs.emailWeeklyDigest === "boolean"
        ? prefs.emailWeeklyDigest
        : DEFAULT_PREFERENCES.emailWeeklyDigest,
  };
}

function shouldSendEmail(type: NotificationType, prefs: NotificationPreferences): boolean {
  switch (type) {
    case "assignment":
      return prefs.emailAssignments;
    case "l10_recap":
    case "l10_reminder":
      return prefs.emailL10Recap;
    case "cascade":
      return prefs.emailAssignments;
    case "people_review_reminder":
    case "scorecard_digest":
      return prefs.emailWeeklyDigest;
    default:
      return false;
  }
}

export async function queueNotification(input: QueueNotificationInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(input.userId);
    const user = data.user;

    if (!user?.email) {
      console.info("[notification] skipped — no email for user", input.userId, input.type);
      return;
    }

    const prefs = parseNotificationPreferences(user.user_metadata as Record<string, unknown>);
    if (!shouldSendEmail(input.type, prefs)) {
      console.info("[notification] skipped by preference", input.userId, input.type);
      return;
    }

    const supabaseUrl = getSupabaseUrl();
    const serviceKey =
      process.env.NOTIFICATIONS_CRON_SECRET ??
      getSupabaseSecretKey();

    if (!supabaseUrl || !serviceKey) {
      console.info("[notification] log only", {
        to: user.email,
        type: input.type,
        subject: input.subject,
        body: input.body,
        actionUrl: input.actionUrl,
      });
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: user.email,
        subject: input.subject,
        body: input.body,
        actionUrl: input.actionUrl,
        type: input.type,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        "[notification] edge function failed",
        input.type,
        response.status,
        detail,
      );
    }
  } catch (error) {
    console.error("[notification] failed to queue", input.type, error);
  }
}

export async function notifyL10Recap(input: {
  userId: string;
  teamName: string;
  recapUrl: string;
}) {
  await queueNotification({
    userId: input.userId,
    type: "l10_recap",
    subject: `L10 recap: ${input.teamName}`,
    body: `Your L10 meeting has concluded. Review the recap and cascading messages.`,
    actionUrl: input.recapUrl,
  });
}

export async function notifyAssignment(input: {
  userId: string;
  title: string;
  actionUrl: string;
}) {
  await queueNotification({
    userId: input.userId,
    type: "assignment",
    subject: input.title,
    body: `You have a new assignment. Open your inbox to review.`,
    actionUrl: input.actionUrl,
  });
}
