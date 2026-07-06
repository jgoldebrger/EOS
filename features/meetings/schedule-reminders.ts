import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications/send";
import {
  formatScheduleSummary,
  getNextOccurrenceUtc,
  shouldSendReminder,
  type MeetingSchedule,
} from "@/features/meetings/schedule-utils";

interface ScheduleWithTeam extends MeetingSchedule {
  team_slug: string;
  team_name: string;
  org_slug: string;
}

function mapScheduleRow(row: Record<string, unknown>): ScheduleWithTeam {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    team_id: row.team_id as string,
    day_of_week: row.day_of_week as number,
    time_local: String(row.time_local).slice(0, 8),
    timezone: row.timezone as string,
    reminder_hours_before: row.reminder_hours_before as number,
    enabled: row.enabled as boolean,
    last_reminder_at: (row.last_reminder_at as string | null) ?? null,
    team_slug: (row.teams as { slug: string; name: string }).slug,
    team_name: (row.teams as { slug: string; name: string }).name,
    org_slug: (row.organizations as { slug: string }).slug,
  };
}

export async function processL10ScheduleReminders(now: Date = new Date()): Promise<{
  processed: number;
  reminded: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_schedules" as never)
    .select("*, teams(slug, name), organizations(slug)")
    .eq("enabled", true);

  if (error || !data) {
    console.error("[l10-reminders] failed to load schedules", error);
    return { processed: 0, reminded: 0 };
  }

  let reminded = 0;

  for (const row of data) {
    const schedule = mapScheduleRow(row as Record<string, unknown>);
    const { due, nextOccurrence } = shouldSendReminder(schedule, now);
    if (!due) {
      continue;
    }

    const { data: members } = await admin
      .from("team_members")
      .select("user_id")
      .eq("team_id", schedule.team_id);

    const memberIds = (members ?? []).map((member) => member.user_id);
    if (memberIds.length === 0) {
      continue;
    }

    const summary = formatScheduleSummary(schedule);
    const l10Url = `/org/${schedule.org_slug}/teams/${schedule.team_slug}/l10`;
    const whenLabel = nextOccurrence.toLocaleString("en-US", {
      timeZone: schedule.timezone,
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    for (const userId of memberIds) {
      await admin.from("inbox_items" as never).insert({
        organization_id: schedule.organization_id,
        assignee_id: userId,
        title: `L10 reminder: ${schedule.team_name}`,
        body: `Your recurring L10 is scheduled for ${whenLabel} (${summary}).`,
        source_type: "l10_schedule",
        source_id: schedule.id,
        action_url: l10Url,
      } as never);

      await queueNotification({
        userId,
        type: "l10_reminder",
        subject: `L10 reminder: ${schedule.team_name}`,
        body: `Your recurring L10 is coming up on ${whenLabel}.`,
        actionUrl: l10Url,
      });
    }

    await admin
      .from("meeting_schedules" as never)
      .update({ last_reminder_at: now.toISOString() } as never)
      .eq("id", schedule.id);

    reminded += 1;
  }

  return { processed: data.length, reminded };
}

export function previewNextOccurrence(schedule: MeetingSchedule): Date {
  return getNextOccurrenceUtc(schedule);
}
