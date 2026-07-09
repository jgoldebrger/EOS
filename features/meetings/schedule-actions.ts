"use server";

import { revalidatePath } from "next/cache";
import {
  deleteMeetingScheduleSchema,
  upsertMeetingScheduleSchema,
} from "@/features/meetings/schedule-schema";
import type { MeetingActionResult } from "@/features/meetings/types";
import { canEditResource } from "@/lib/permissions/checks";

import { getActionActor as getActorContext } from "@/lib/auth/get-action-actor";

export async function upsertMeetingSchedule(input: unknown): Promise<MeetingActionResult> {
  const parsed = upsertMeetingScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid schedule",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "meetings")) {
    return { success: false, error: "You do not have permission to manage L10 schedules" };
  }

  const { error } = await actor.supabase.from("meeting_schedules").upsert(
    {
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId,
      day_of_week: parsed.data.dayOfWeek,
      time_local: `${parsed.data.timeLocal}:00`,
      timezone: parsed.data.timezone,
      reminder_hours_before: parsed.data.reminderHoursBefore,
      enabled: parsed.data.enabled,
      created_by: actor.user.id,
    },
    { onConflict: "team_id" },
  );

  if (error) {
    return { success: false, error: "Could not save L10 schedule" };
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/teams/${parsed.data.teamSlug}/l10`);
  return { success: true };
}

export async function deleteMeetingSchedule(input: unknown): Promise<MeetingActionResult> {
  const parsed = deleteMeetingScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditResource(actor.orgRole, "meetings")) {
    return { success: false, error: "You do not have permission to manage L10 schedules" };
  }

  const { error } = await actor.supabase
    .from("meeting_schedules")
    .delete()
    .eq("organization_id", parsed.data.organizationId)
    .eq("team_id", parsed.data.teamId);

  if (error) {
    return { success: false, error: "Could not remove L10 schedule" };
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/teams/${parsed.data.teamSlug}/l10`);
  return { success: true };
}
