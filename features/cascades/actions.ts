"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { insertInboxItem } from "@/features/inbox/internal";
import { acknowledgeCascadeSchema, sendCascadesSchema } from "@/features/cascades/schema";
import { queueNotification } from "@/lib/notifications/send";
import {
  enforceAdminPrivilegedSession,
  getActionActor,
  isActionActorError,
  requireEditableActor,
} from "@/lib/auth/get-action-actor";
import { canManageOrg } from "@/lib/permissions/checks";

export type CascadeActionResult =
  | { success: true; deliveredCount?: number }
  | { success: false; error: string };

async function getTeamLeaderIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("team_role", "leader");

  return (data ?? []).map((row) => row.user_id);
}

export async function sendCascades(input: unknown): Promise<CascadeActionResult> {
  const parsed = sendCascadesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid cascade request",
    };
  }

  const actor = await requireEditableActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { data: teams } = await actor.supabase
    .from("teams")
    .select("id, slug, name")
    .eq("organization_id", parsed.data.organizationId)
    .in("id", parsed.data.targetTeamIds);

  if (!teams?.length) {
    return { success: false, error: "No valid target teams" };
  }

  let deliveredCount = 0;

  for (const team of teams) {
    const { data: delivery, error } = await actor.supabase
      .from("cascade_deliveries")
      .insert({
        organization_id: parsed.data.organizationId,
        source_type: parsed.data.sourceType,
        source_id: parsed.data.sourceId ?? null,
        source_label: parsed.data.sourceLabel,
        target_team_id: team.id,
        created_by: actor.user.id,
      })
      .select("id")
      .single();

    if (error || !delivery) {
      continue;
    }

    deliveredCount += 1;

    await actor.supabase.from("headlines" as never).insert({
      organization_id: parsed.data.organizationId,
      team_id: team.id,
      title: `[Cascade] ${parsed.data.sourceLabel}`,
      body: `Cascaded from team message. Acknowledge when shared with your team.`,
      headline_type: "employee",
      is_cascading: false,
      created_by: actor.user.id,
    } as never);

    const leaderIds = await getTeamLeaderIds(actor.supabase, team.id);
    const actionUrl = `/org/${parsed.data.orgSlug}/teams/${team.slug}/headlines`;

    for (const leaderId of leaderIds) {
      await insertInboxItem(actor.supabase, {
        organizationId: parsed.data.organizationId,
        assigneeId: leaderId,
        title: `Cascade to acknowledge: ${parsed.data.sourceLabel}`,
        body: `Share this message with ${team.name} and mark acknowledged in your inbox.`,
        sourceType: "cascade",
        sourceId: delivery.id,
        actionUrl,
      });

      await queueNotification({
        userId: leaderId,
        type: "cascade",
        subject: `Cascade: ${parsed.data.sourceLabel}`,
        body: `A message was cascaded to ${team.name}. Review it in your inbox.`,
        actionUrl,
      });
    }
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/org/${parsed.data.orgSlug}/reports`);

  return { success: true, deliveredCount };
}

export async function acknowledgeCascade(input: unknown): Promise<CascadeActionResult> {
  const parsed = acknowledgeCascadeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid acknowledge request" };
  }

  const actor = await getActionActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { data: cascade } = await actor.supabase
    .from("cascade_deliveries")
    .select("id, status, target_team_id")
    .eq("id", parsed.data.cascadeId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!cascade) {
    return { success: false, error: "Cascade not found" };
  }

  if (cascade.status === "acknowledged") {
    return { success: true };
  }

  const { data: leadership } = await actor.supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", cascade.target_team_id)
    .eq("user_id", actor.user.id)
    .maybeSingle();

  const isLeader = leadership?.team_role === "leader";
  const isAdmin = canManageOrg(actor.orgRole);

  if (!isLeader && !isAdmin) {
    return { success: false, error: "Only team leaders can acknowledge cascades" };
  }

  if (isAdmin) {
    const privileged = await enforceAdminPrivilegedSession(actor.orgRole);
    if ("error" in privileged) {
      return { success: false, error: privileged.error };
    }
  }

  const { error } = await actor.supabase
    .from("cascade_deliveries")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: actor.user.id,
    })
    .eq("id", parsed.data.cascadeId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: "Could not acknowledge cascade" };
  }

  if (parsed.data.inboxItemId) {
    await actor.supabase
      .from("inbox_items" as never)
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", parsed.data.inboxItemId)
      .eq("assignee_id", actor.user.id);
  }

  revalidatePath(`/org/${parsed.data.orgSlug}/inbox`);
  revalidatePath(`/org/${parsed.data.orgSlug}/reports`);

  return { success: true };
}

export async function sendMeetingCascades(
  organizationId: string,
  orgSlug: string,
  sourceTeamId: string,
  meetingId: string,
  messages: Array<{ label: string; completed: boolean }>,
): Promise<void> {
  const completed = messages.filter((message) => message.completed);
  if (completed.length === 0) {
    return;
  }

  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("organization_id", organizationId)
    .neq("id", sourceTeamId);

  const targetTeamIds = (teams ?? []).map((team) => team.id);
  if (targetTeamIds.length === 0) {
    return;
  }

  for (const message of completed) {
    await sendCascades({
      organizationId,
      orgSlug,
      sourceTeamId,
      sourceType: "meeting_message",
      sourceId: meetingId,
      sourceLabel: message.label,
      targetTeamIds,
    });
  }
}
