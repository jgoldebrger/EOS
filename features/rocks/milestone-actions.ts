"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  completeRockMilestoneSchema,
  createRockMilestoneSchema,
  deleteRockMilestoneSchema,
  updateRockMilestoneSchema,
} from "@/features/rocks/milestone-schema";
import type { RockActionResult } from "@/features/rocks/types";
import { canEditResource, canManageOrg, canManageTeam } from "@/lib/permissions/checks";
import type { OrgRole, TeamRole } from "@/types/domain";
import type { TablesUpdate } from "@/types/database";

import { getActionActor as getActorContext } from "@/lib/auth/get-action-actor";

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

async function syncRockProgressFromMilestones(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  rockId: string,
) {
  const { data: milestones } = await supabase
    .from("rock_milestones")
    .select("completed_at")
    .eq("organization_id", organizationId)
    .eq("rock_id", rockId);

  if (!milestones || milestones.length === 0) {
    return;
  }

  const completed = milestones.filter((row) => row.completed_at !== null).length;
  const progress = Math.round((completed / milestones.length) * 100);

  await supabase
    .from("rocks")
    .update({ progress } satisfies TablesUpdate<"rocks">)
    .eq("id", rockId)
    .eq("organization_id", organizationId);
}

async function revalidateRocks(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/rocks`);
}

async function getRockContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  rockId: string,
) {
  return supabase
    .from("rocks")
    .select("owner_id, team_id")
    .eq("id", rockId)
    .eq("organization_id", organizationId)
    .maybeSingle();
}

export async function createRockMilestone(input: unknown): Promise<RockActionResult> {
  const parsed = createRockMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid milestone",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: rock } = await getRockContext(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
  );

  if (!rock) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    rock.owner_id,
    rock.team_id,
  );

  if (!allowed) {
    return { success: false, error: "You do not have permission to add milestones" };
  }

  const { count } = await actor.supabase
    .from("rock_milestones")
    .select("id", { count: "exact", head: true })
    .eq("rock_id", parsed.data.rockId);

  const { error } = await actor.supabase.from("rock_milestones").insert({
    organization_id: parsed.data.organizationId,
    rock_id: parsed.data.rockId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate ?? null,
    sort_order: parsed.data.sortOrder ?? (count ?? 0),
  });

  if (error) {
    return { success: false, error: "Unable to create milestone" };
  }

  await syncRockProgressFromMilestones(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
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

export async function updateRockMilestone(input: unknown): Promise<RockActionResult> {
  const parsed = updateRockMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid milestone",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: rock } = await getRockContext(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
  );

  if (!rock) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    rock.owner_id,
    rock.team_id,
  );

  if (!allowed) {
    return { success: false, error: "You do not have permission to update milestones" };
  }

  const updates: TablesUpdate<"rock_milestones"> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate;
  if (parsed.data.sortOrder !== undefined) updates.sort_order = parsed.data.sortOrder;

  const { error } = await actor.supabase
    .from("rock_milestones")
    .update(updates)
    .eq("id", parsed.data.milestoneId)
    .eq("rock_id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: "Unable to update milestone" };
  }

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

export async function completeRockMilestone(input: unknown): Promise<RockActionResult> {
  const parsed = completeRockMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid milestone update",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: rock } = await getRockContext(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
  );

  if (!rock) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    rock.owner_id,
    rock.team_id,
  );

  if (!allowed) {
    return { success: false, error: "You do not have permission to update milestones" };
  }

  const { error } = await actor.supabase
    .from("rock_milestones")
    .update({
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.milestoneId)
    .eq("rock_id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: "Unable to update milestone" };
  }

  await syncRockProgressFromMilestones(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
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

export async function deleteRockMilestone(input: unknown): Promise<RockActionResult> {
  const parsed = deleteRockMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid delete request",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: rock } = await getRockContext(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
  );

  if (!rock) {
    return { success: false, error: "Rock not found" };
  }

  const allowed = await canManageRock(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    rock.owner_id,
    rock.team_id,
  );

  if (!allowed) {
    return { success: false, error: "You do not have permission to delete milestones" };
  }

  const { error } = await actor.supabase
    .from("rock_milestones")
    .delete()
    .eq("id", parsed.data.milestoneId)
    .eq("rock_id", parsed.data.rockId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return { success: false, error: "Unable to delete milestone" };
  }

  await syncRockProgressFromMilestones(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.rockId,
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
