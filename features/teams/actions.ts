"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  addTeamMemberSchema,
  createTeamSchema,
  removeTeamMemberSchema,
  teamSlugFromName,
} from "@/features/teams/schema";
import type {
  CreateTeamResult,
  TeamMemberMutationResult,
} from "@/features/teams/types";
import { AUDIT_ACTIONS } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";
import {
  isActionActorError,
  requireAdminActor,
  requireTeamMutator,
} from "@/lib/auth/get-action-actor";

async function revalidateTeamPeoplePaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
) {
  const { data: team } = await supabase
    .from("teams")
    .select("slug, organization_id")
    .eq("id", teamId)
    .single();

  if (!team) return;

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", team.organization_id)
    .single();

  if (org?.slug) {
    revalidatePath(`/org/${org.slug}/teams/${team.slug}/people`);
    revalidatePath(`/org/${org.slug}/teams/${team.slug}/overview`);
  }
}

export async function createTeam(input: unknown): Promise<CreateTeamResult> {
  const parsed = createTeamSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid team details",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { organizationId, name } = parsed.data;
  const slug = parsed.data.slug ?? teamSlugFromName(name);

  const { data: team, error: teamError } = await actor.supabase
    .from("teams")
    .insert({
      organization_id: organizationId,
      name,
      slug,
      created_by: actor.user.id,
    })
    .select("id, slug, organization_id")
    .single();

  if (teamError) {
    if (teamError.code === "23505") {
      return {
        success: false,
        error: "A team with this slug already exists in your organization.",
      };
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[createTeam]", teamError);
    }
    return {
      success: false,
      error:
        process.env.NODE_ENV === "development"
          ? `Unable to create team: ${teamError.message}`
          : "Unable to create team. Please try again.",
    };
  }

  const { error: memberError } = await actor.supabase.from("team_members").insert({
    team_id: team.id,
    user_id: actor.user.id,
    team_role: "leader",
    created_by: actor.user.id,
  });

  if (memberError) {
    return {
      success: false,
      error: "Unable to add you as team leader. Please try again.",
    };
  }

  await logAuditEvent(actor.supabase, {
    organizationId: team.organization_id,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "teams",
    entityId: team.id,
    metadata: { name, slug },
  });

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", team.organization_id)
    .single();

  if (org?.slug) {
    revalidatePath(`/org/${org.slug}/dashboard`);
    revalidatePath(`/org/${org.slug}/teams`);
  }

  return { success: true, slug: team.slug };
}

export async function addTeamMember(
  input: unknown,
): Promise<TeamMemberMutationResult> {
  const parsed = addTeamMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid member details",
    };
  }

  const { teamId, organizationId, userId, teamRole } = parsed.data;
  const actor = await requireTeamMutator(organizationId, teamId);

  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { data: orgMember } = await actor.supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!orgMember) {
    return {
      success: false,
      error: "That person must be an organization member before joining the team.",
    };
  }

  const { error } = await actor.supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    team_role: teamRole,
    created_by: actor.user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This person is already on the team." };
    }
    return { success: false, error: "Unable to add team member. Please try again." };
  }

  await logAuditEvent(actor.supabase, {
    organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "team_members",
    entityId: teamId,
    metadata: { userId, teamRole },
  });

  await revalidateTeamPeoplePaths(actor.supabase, teamId);

  return { success: true };
}

export async function updateTeamMemberRole(
  input: unknown,
): Promise<TeamMemberMutationResult> {
  const { updateTeamMemberRoleSchema } = await import("@/features/teams/schema");
  const parsed = updateTeamMemberRoleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { teamId, organizationId, memberId, teamRole } = parsed.data;
  const actor = await requireTeamMutator(organizationId, teamId);

  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { error } = await actor.supabase
    .from("team_members")
    .update({ team_role: teamRole })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    return { success: false, error: "Could not update team role" };
  }

  await logAuditEvent(actor.supabase, {
    organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "team_members",
    entityId: memberId,
    metadata: { teamRole },
  });

  await revalidateTeamPeoplePaths(actor.supabase, teamId);
  return { success: true };
}

export async function removeTeamMember(
  input: unknown,
): Promise<TeamMemberMutationResult> {
  const parsed = removeTeamMemberSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request",
    };
  }

  const { teamId, organizationId, memberId } = parsed.data;
  const actor = await requireTeamMutator(organizationId, teamId);

  if (isActionActorError(actor)) {
    return { success: false, error: actor.error };
  }

  const { data: memberRow } = await actor.supabase
    .from("team_members")
    .select("id, user_id, team_role")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!memberRow) {
    return { success: false, error: "Team member not found." };
  }

  if (memberRow.user_id === actor.user.id) {
    return { success: false, error: "You cannot remove yourself from the team." };
  }

  const { error } = await actor.supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    return { success: false, error: "Unable to remove team member. Please try again." };
  }

  await logAuditEvent(actor.supabase, {
    organizationId,
    actorId: actor.user.id,
    action: AUDIT_ACTIONS.DELETE,
    entityType: "team_members",
    entityId: memberId,
    metadata: { teamId, userId: memberRow.user_id },
  });

  await revalidateTeamPeoplePaths(actor.supabase, teamId);

  return { success: true };
}
