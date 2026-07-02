"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createDecisionSchema,
  createMeetingSchema,
  endMeetingSchema,
  l10AgendaDurationsSchema,
  saveNoteSchema,
  startMeetingSchema,
  updateActiveSectionSchema,
} from "@/features/meetings/schema";
import type {
  CreateMeetingResult,
  MeetingActionResult,
} from "@/features/meetings/types";
import { getDefaultL10Agenda, getFirstSectionKey } from "@/features/meetings/utils";
import { getOrgL10AgendaTemplate } from "@/features/meetings/queries";
import { canEditResource, canManageOrg } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole } from "@/types/domain";
import type { Json } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

async function getActorContext(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" } as const;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" } as const;
  }

  return {
    supabase,
    user,
    orgRole: membership.org_role as OrgRole,
  } as const;
}

function canEditMeetings(orgRole: OrgRole): boolean {
  return canEditResource(orgRole, "meetings");
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  entityType: "meetings" | "meeting_notes",
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  entityId: string,
  metadata: Json,
) {
  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
  });
}

async function getOrgSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .single();

  return data?.slug ?? null;
}

async function revalidateMeetings(orgSlug: string, meetingId?: string) {
  revalidatePath(`/org/${orgSlug}/meetings`);
  revalidatePath(`/org/${orgSlug}/settings/l10`);
  revalidatePath(`/org/${orgSlug}/teams`);
  if (meetingId) {
    revalidatePath(`/org/${orgSlug}/meetings/${meetingId}`);
  }
}

export async function updateOrgL10Agenda(
  input: unknown,
): Promise<MeetingActionResult> {
  const parsed = l10AgendaDurationsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid agenda timings",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canManageOrg(actor.orgRole)) {
    return {
      success: false,
      error: "Only organization admins can change L10 agenda timings",
    };
  }

  const { data: org, error: orgError } = await actor.supabase
    .from("organizations")
    .select("settings")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();

  if (orgError || !org) {
    return { success: false, error: "Organization not found" };
  }

  const currentSettings =
    typeof org.settings === "object" &&
    org.settings !== null &&
    !Array.isArray(org.settings)
      ? (org.settings as Record<string, unknown>)
      : {};

  const nextSettings = {
    ...currentSettings,
    l10AgendaDurations: parsed.data.durations,
  };

  const { error } = await actor.supabase
    .from("organizations")
    .update({ settings: nextSettings as Json })
    .eq("id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: "Unable to save L10 agenda timings" };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.UPDATE,
    parsed.data.organizationId,
    { l10AgendaDurations: parsed.data.durations } as Json,
  );

  revalidateMeetings(parsed.data.orgSlug);
  return { success: true };
}

export async function createMeeting(input: unknown): Promise<CreateMeetingResult> {
  const parsed = createMeetingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid meeting details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to create meetings",
    };
  }

  const meetingType = parsed.data.meetingType ?? "l10";
  const agenda =
    meetingType === "l10"
      ? await getOrgL10AgendaTemplate(parsed.data.organizationId)
      : ([] as Json);

  const { data: meeting, error } = await actor.supabase
    .from("meetings")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title ?? "L10 Meeting",
      meeting_type: meetingType,
      agenda_template: agenda as Json,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !meeting) {
    return {
      success: false,
      error: "Unable to create meeting. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.CREATE,
    meeting.id,
    { title: parsed.data.title ?? "L10 Meeting", meeting_type: meetingType } as Json,
  );

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, meeting.id);
  }

  return { success: true, meetingId: meeting.id };
}

export async function startMeeting(input: unknown): Promise<MeetingActionResult> {
  const parsed = startMeetingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid start request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to start this meeting",
    };
  }

  const { data: existing } = await actor.supabase
    .from("meetings")
    .select("status, agenda_template")
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Meeting not found" };
  }

  if (existing.status === "completed" || existing.status === "cancelled") {
    return {
      success: false,
      error: "This meeting has already ended",
    };
  }

  const firstSection = getFirstSectionKey(
    Array.isArray(existing.agenda_template)
      ? (existing.agenda_template as { key: string; label: string; durationMinutes: number; required: boolean }[])
      : getDefaultL10Agenda(),
  );
  const startedAt = new Date().toISOString();

  const { error } = await actor.supabase
    .from("meetings")
    .update({
      status: "in_progress",
      started_at: startedAt,
      active_section_key: firstSection,
    })
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to start meeting. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.UPDATE,
    parsed.data.meetingId,
    { status: "in_progress", started_at: startedAt } as Json,
  );

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, parsed.data.meetingId);
  }

  return { success: true };
}

export async function updateActiveSection(
  input: unknown,
): Promise<MeetingActionResult> {
  const parsed = updateActiveSectionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid section update",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to update this meeting",
    };
  }

  const { data: existing } = await actor.supabase
    .from("meetings")
    .select("status")
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Meeting not found" };
  }

  if (existing.status !== "in_progress") {
    return {
      success: false,
      error: "Meeting must be in progress to change sections",
    };
  }

  const { error } = await actor.supabase
    .from("meetings")
    .update({ active_section_key: parsed.data.sectionKey })
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update active section. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.UPDATE,
    parsed.data.meetingId,
    { active_section_key: parsed.data.sectionKey } as Json,
  );

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, parsed.data.meetingId);
  }

  return { success: true };
}

export async function saveMeetingNote(input: unknown): Promise<MeetingActionResult> {
  const parsed = saveNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid note",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to save notes",
    };
  }

  const { data: existingNote } = await actor.supabase
    .from("meeting_notes")
    .select("id")
    .eq("meeting_id", parsed.data.meetingId)
    .eq("section_key", parsed.data.sectionKey)
    .maybeSingle();

  if (existingNote) {
    const { error } = await actor.supabase
      .from("meeting_notes")
      .update({ content: parsed.data.content })
      .eq("id", existingNote.id)
      .eq("organization_id", parsed.data.organizationId);

    if (error) {
      return {
        success: false,
        error: "Unable to save note. Please try again.",
      };
    }

    await writeAudit(
      actor.supabase,
      parsed.data.organizationId,
      actor.user.id,
      "meeting_notes",
      AUDIT_ACTIONS.UPDATE,
      existingNote.id,
      { section_key: parsed.data.sectionKey } as Json,
    );
  } else {
    const { data: note, error } = await actor.supabase
      .from("meeting_notes")
      .insert({
        organization_id: parsed.data.organizationId,
        meeting_id: parsed.data.meetingId,
        section_key: parsed.data.sectionKey,
        content: parsed.data.content,
        created_by: actor.user.id,
      })
      .select("id")
      .single();

    if (error || !note) {
      return {
        success: false,
        error: "Unable to save note. Please try again.",
      };
    }

    await writeAudit(
      actor.supabase,
      parsed.data.organizationId,
      actor.user.id,
      "meeting_notes",
      AUDIT_ACTIONS.CREATE,
      note.id,
      { section_key: parsed.data.sectionKey } as Json,
    );
  }

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, parsed.data.meetingId);
  }

  return { success: true };
}

export async function createDecision(input: unknown): Promise<MeetingActionResult> {
  const parsed = createDecisionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid decision",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to record decisions",
    };
  }

  const { data: decision, error } = await actor.supabase
    .from("decisions")
    .insert({
      organization_id: parsed.data.organizationId,
      meeting_id: parsed.data.meetingId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      decided_by: parsed.data.decidedBy ?? actor.user.id,
    })
    .select("id")
    .single();

  if (error || !decision) {
    return {
      success: false,
      error: "Unable to record decision. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.CREATE,
    parsed.data.meetingId,
    { decision_id: decision.id, title: parsed.data.title } as Json,
  );

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, parsed.data.meetingId);
  }

  return { success: true };
}

export async function endMeeting(input: unknown): Promise<MeetingActionResult> {
  const parsed = endMeetingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid end request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canEditMeetings(actor.orgRole)) {
    return {
      success: false,
      error: "You do not have permission to end this meeting",
    };
  }

  const { data: existing } = await actor.supabase
    .from("meetings")
    .select("status")
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Meeting not found" };
  }

  if (existing.status === "completed" || existing.status === "cancelled") {
    return { success: true };
  }

  const endedAt = new Date().toISOString();

  const { error } = await actor.supabase
    .from("meetings")
    .update({
      status: "completed",
      ended_at: endedAt,
      active_section_key: null,
    })
    .eq("id", parsed.data.meetingId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to end meeting. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    "meetings",
    AUDIT_ACTIONS.UPDATE,
    parsed.data.meetingId,
    { status: "completed", ended_at: endedAt } as Json,
  );

  const orgSlug = await getOrgSlug(actor.supabase, parsed.data.organizationId);
  if (orgSlug) {
    await revalidateMeetings(orgSlug, parsed.data.meetingId);
  }

  return { success: true };
}
