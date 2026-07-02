"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  archiveRockSchema,
  createRockSchema,
  updateRockSchema,
  updateRockStatusSchema,
} from "@/features/rocks/schema";
import { createRockMilestone } from "@/features/rocks/milestone-actions";
import type { CreateRockResult, RockActionResult } from "@/features/rocks/types";
import { canEditResource, canManageOrg, canManageTeam } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole, TeamRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
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

async function canManageRock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgRole: OrgRole,
  userId: string,
  ownerId: string,
  teamId: string | null | undefined,
): Promise<boolean> {
  if (!canEditResource(orgRole, "rocks")) {
    return false;
  }

  if (ownerId === userId) {
    return true;
  }

  if (canManageOrg(orgRole)) {
    return true;
  }

  if (!teamId) {
    return false;
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return false;
  }

  return canManageTeam(orgRole, membership.team_role as TeamRole);
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  entityId: string,
  metadata: Json,
) {
  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType: "rocks",
    entityId,
    metadata,
  });
}

async function revalidateRocks(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/rocks`);
}

export async function createRock(input: unknown): Promise<CreateRockResult> {
  const parsed = createRockSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid rock details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    parsed.data.ownerId,
    parsed.data.teamId ?? null,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create this rock",
    };
  }

  const { data: rock, error } = await actor.supabase
    .from("rocks")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      title: parsed.data.title,
      owner_id: parsed.data.ownerId,
      quarter: parsed.data.quarter,
      status: parsed.data.status ?? "on_track",
      confidence: parsed.data.confidence ?? null,
      due_date: parsed.data.dueDate ?? null,
      success_definition: parsed.data.successDefinition ?? null,
      progress: parsed.data.progress ?? 0,
      rock_type: parsed.data.rockType ?? "team",
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !rock) {
    return {
      success: false,
      error: "Unable to create rock. Please try again.",
    };
  }

  if (parsed.data.initialMilestones?.length) {
    for (const [index, milestone] of parsed.data.initialMilestones.entries()) {
      await createRockMilestone({
        organizationId: parsed.data.organizationId,
        rockId: rock.id,
        title: milestone.title,
        dueDate: milestone.dueDate ?? null,
        sortOrder: index,
      });
    }
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    rock.id,
    { title: parsed.data.title, quarter: parsed.data.quarter } as Json,
  );

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    await revalidateRocks(orgRow.slug);
  }

  return { success: true, rockId: rock.id };
}

export async function updateRock(input: unknown): Promise<RockActionResult> {
  const parsed = updateRockSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid rock details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("rocks")
    .select("owner_id, team_id")
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Rock not found" };
  }

  const ownerId = parsed.data.ownerId ?? existing.owner_id;
  const teamId = parsed.data.teamId ?? existing.team_id;

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    ownerId,
    teamId,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this rock",
    };
  }

  const updates: TablesUpdate<"rocks"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.teamId !== undefined) updates.team_id = parsed.data.teamId;
  if (parsed.data.ownerId !== undefined) updates.owner_id = parsed.data.ownerId;
  if (parsed.data.quarter !== undefined) updates.quarter = parsed.data.quarter;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.confidence !== undefined) updates.confidence = parsed.data.confidence;
  if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate;
  if (parsed.data.successDefinition !== undefined) {
    updates.success_definition = parsed.data.successDefinition;
  }
  if (parsed.data.progress !== undefined) updates.progress = parsed.data.progress;
  if (parsed.data.rockType !== undefined) updates.rock_type = parsed.data.rockType;

  const { error } = await actor.supabase
    .from("rocks")
    .update(updates)
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update rock. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.rockId,
    updates as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateRocks(org.slug);
  }

  return { success: true };
}

export async function updateRockStatus(input: unknown): Promise<RockActionResult> {
  const parsed = updateRockStatusSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid status update",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("rocks")
    .select("owner_id, team_id")
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    existing.owner_id,
    existing.team_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this rock",
    };
  }

  const updates: TablesUpdate<"rocks"> = { status: parsed.data.status };
  if (parsed.data.progress !== undefined) updates.progress = parsed.data.progress;
  if (parsed.data.confidence !== undefined) updates.confidence = parsed.data.confidence;

  const { error } = await actor.supabase
    .from("rocks")
    .update(updates)
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update rock status. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    parsed.data.rockId,
    updates as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateRocks(org.slug);
  }

  return { success: true };
}

export async function archiveRock(input: unknown): Promise<RockActionResult> {
  const parsed = archiveRockSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid archive request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("rocks")
    .select("owner_id, team_id")
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    existing.owner_id,
    existing.team_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to archive this rock",
    };
  }

  const { error } = await actor.supabase
    .from("rocks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to archive rock. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.ARCHIVE,
    parsed.data.rockId,
    {} as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateRocks(org.slug);
  }

  return { success: true };
}
