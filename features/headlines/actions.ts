"use server";

import { revalidatePath } from "next/cache";
import {
  getActionActor,
  requireEditableActor,
} from "@/lib/auth/get-action-actor";
import {
  archiveHeadlineSchema,
  createHeadlineSchema,
  updateHeadlineSchema,
} from "@/features/headlines/schema";
import { logAuditEvent } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/types/domain";

export async function createHeadline(input: unknown) {
  const parsed = createHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid headline" };
  }

  const actor = await requireEditableActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false as const, error: actor.error };
  }

  const { data, error } = await actor.supabase
    .from("headlines")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      body: parsed.data.body ?? "",
      headline_type: parsed.data.headlineType,
      meeting_id: parsed.data.meetingId ?? null,
      is_cascading: parsed.data.isCascading ?? false,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false as const, error: "Could not create headline" };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: parsed.data.organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "headlines",
    entityId: data.id,
  });

  revalidatePath("/");
  return { success: true as const, headlineId: data.id };
}

export async function updateHeadline(input: unknown) {
  const parsed = updateHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid headline update" };
  }

  const actor = await requireEditableActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false as const, error: actor.error };
  }

  const updates: {
    title?: string;
    body?: string;
    headline_type?: "customer" | "employee";
    is_cascading?: boolean;
  } = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.headlineType !== undefined) {
    updates.headline_type = parsed.data.headlineType;
  }
  if (parsed.data.isCascading !== undefined) {
    updates.is_cascading = parsed.data.isCascading;
  }

  const { error } = await actor.supabase
    .from("headlines")
    .update(updates)
    .eq("id", parsed.data.headlineId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false as const, error: "Could not update headline" };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: parsed.data.organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "headlines",
    entityId: parsed.data.headlineId,
  });

  revalidatePath("/");
  return { success: true as const };
}

export async function archiveHeadline(input: unknown) {
  const parsed = archiveHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid archive request" };
  }

  const actor = await requireEditableActor(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false as const, error: actor.error };
  }

  const { error } = await actor.supabase
    .from("headlines")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.headlineId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false as const, error: "Could not archive headline" };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: parsed.data.organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.ARCHIVE,
    entityType: "headlines",
    entityId: parsed.data.headlineId,
  });

  revalidatePath("/");
  return { success: true as const };
}

export async function getHeadlinesForTeam(organizationId: string, teamId: string) {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return [];
  }

  const { data } = await actor.supabase
    .from("headlines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    headline_type: string;
    created_at: string;
  }>;
}
