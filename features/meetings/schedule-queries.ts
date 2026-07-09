import { createClient } from "@/lib/supabase/server";
import type { MeetingSchedule } from "@/features/meetings/schedule-utils";

function mapRow(row: Record<string, unknown>): MeetingSchedule {
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
  };
}

export async function getMeetingScheduleForTeam(
  organizationId: string,
  teamId: string,
): Promise<MeetingSchedule | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meeting_schedules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}
