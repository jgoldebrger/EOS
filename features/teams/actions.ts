"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
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
import { AUDIT_ACTIONS, type OrgRole, type TeamRole } from "@/types/domain";
import { logAuditEvent } from "@/lib/audit";
import { canManageTeam } from "@/lib/permissions/checks";

async function assertCanManageTeamMembers(
  organizationId: string,
  teamId: string,
): Promise<
  | { ok: true; userId: string; orgRole: OrgRole; teamRole: TeamRole }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: orgMembership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!orgMembership) {
    return { ok: false, error: "You are not a member of this organization." };
  }

  const orgRole = orgMembership.org_role as OrgRole;

  const { data: teamMembership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  const teamRole = (teamMembership?.team_role ?? "viewer") as TeamRole;

  if (!canManageTeam(orgRole, teamRole)) {
    return {
      ok: false,
      error: "You do not have permission to manage team members.",
    };
  }

  return { ok: true, userId: user.id, orgRole, teamRole };
}

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

  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return { success: false, error: "You must be signed in to create a team" };
  }

  const { organizationId, name } = parsed.data;
  const slug = parsed.data.slug ?? teamSlugFromName(name);

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    !membership ||
    (membership.org_role !== "owner" && membership.org_role !== "admin")
  ) {
    return {
      success: false,
      error: "You do not have permission to create teams in this organization.",
    };
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      organization_id: organizationId,
      name,
      slug,
      created_by: user.id,
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

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    team_role: "leader",
    created_by: user.id,
  });

  if (memberError) {
    return {
      success: false,
      error: "Unable to add you as team leader. Please try again.",
    };
  }

  await logAuditEvent(supabase, {
    organizationId: team.organization_id,
    actorId: user.id,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "teams",
    entityId: team.id,
    metadata: { name, slug },
  });

  const { data: org } = await supabase
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
  const access = await assertCanManageTeamMembers(organizationId, teamId);

  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();

  const { data: orgMember } = await supabase
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

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: userId,
    team_role: teamRole,
    created_by: access.userId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This person is already on the team." };
    }
    return { success: false, error: "Unable to add team member. Please try again." };
  }

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.CREATE,
    entityType: "team_members",
    entityId: teamId,
    metadata: { userId, teamRole },
  });

  await revalidateTeamPeoplePaths(supabase, teamId);

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
  const access = await assertCanManageTeamMembers(organizationId, teamId);

  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .update({ team_role: teamRole })
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    return { success: false, error: "Could not update team role" };
  }

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.UPDATE,
    entityType: "team_members",
    entityId: memberId,
    metadata: { teamRole },
  });

  await revalidateTeamPeoplePaths(supabase, teamId);
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
  const access = await assertCanManageTeamMembers(organizationId, teamId);

  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const supabase = await createClient();

  const { data: memberRow } = await supabase
    .from("team_members")
    .select("id, user_id, team_role")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!memberRow) {
    return { success: false, error: "Team member not found." };
  }

  if (memberRow.user_id === access.userId) {
    return { success: false, error: "You cannot remove yourself from the team." };
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);

  if (error) {
    return { success: false, error: "Unable to remove team member. Please try again." };
  }

  await logAuditEvent(supabase, {
    organizationId,
    actorId: access.userId,
    action: AUDIT_ACTIONS.DELETE,
    entityType: "team_members",
    entityId: memberId,
    metadata: { teamId, userId: memberRow.user_id },
  });

  await revalidateTeamPeoplePaths(supabase, teamId);

  return { success: true };
}
