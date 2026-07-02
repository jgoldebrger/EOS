"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("headlines" as never)
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      body: parsed.data.body ?? "",
      headline_type: parsed.data.headlineType,
      meeting_id: parsed.data.meetingId ?? null,
      created_by: user.id,
    } as never)
    .select("id")
    .single();

  if (error || !data) {
    return { success: false as const, error: "Could not create headline" };
  }

  await logAuditEvent(supabase, {
    organizationId: parsed.data.organizationId,
    actorId: user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "issues",
    entityId: (data as { id: string }).id,
    metadata: { type: "headline" },
  });

  revalidatePath("/");
  return { success: true as const, headlineId: (data as { id: string }).id };
}

export async function updateHeadline(input: unknown) {
  const parsed = updateHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid headline update" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (parsed.data.headlineType !== undefined) {
    updates.headline_type = parsed.data.headlineType;
  }

  const { error } = await supabase
    .from("headlines" as never)
    .update(updates as never)
    .eq("id", parsed.data.headlineId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false as const, error: "Could not update headline" };
  }

  await logAuditEvent(supabase, {
    organizationId: parsed.data.organizationId,
    actorId: user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "issues",
    entityId: parsed.data.headlineId,
    metadata: { type: "headline" },
  });

  revalidatePath("/");
  return { success: true as const };
}

export async function archiveHeadline(input: unknown) {
  const parsed = archiveHeadlineSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid archive request" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("headlines" as never)
    .update({ archived_at: new Date().toISOString() } as never)
    .eq("id", parsed.data.headlineId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false as const, error: "Could not archive headline" };
  }

  await logAuditEvent(supabase, {
    organizationId: parsed.data.organizationId,
    actorId: user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "issues",
    entityId: parsed.data.headlineId,
    metadata: { type: "headline", archived: true },
  });

  revalidatePath("/");
  return { success: true as const };
}

export async function getHeadlinesForTeam(organizationId: string, teamId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("headlines" as never)
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
