import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { cache } from "react";
import { requireMandatoryAdminMfa } from "@/lib/auth/mfa-requirements";
import { requirePrivilegedSession } from "@/lib/auth/privileged-session";
import {
  canEditResource,
  canManageOrg,
  canManageTeam,
} from "@/lib/permissions/checks";
import type { OrgRole, TeamRole } from "@/types/domain";

export type ActionActor = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<typeof getServerSessionUser>>>;
  orgRole: OrgRole;
};

export type TeamMutatorActor = ActionActor & {
  teamRole: TeamRole;
};

export type ActionActorError = { error: string };

/** MFA enrollment + step-up when the actor is an org admin/owner. */
export async function enforceAdminPrivilegedSession(
  orgRole: OrgRole,
): Promise<{ ok: true } | ActionActorError> {
  if (!canManageOrg(orgRole)) {
    return { ok: true };
  }

  const mfaEnrollment = await requireMandatoryAdminMfa(orgRole);
  if ("error" in mfaEnrollment) {
    return { error: mfaEnrollment.error };
  }

  const privileged = await requirePrivilegedSession();
  if ("error" in privileged) {
    return { error: privileged.error };
  }

  return { ok: true };
}

async function applyAdminPrivilegedChecks(
  orgRole: OrgRole,
): Promise<ActionActorError | null> {
  const result = await enforceAdminPrivilegedSession(orgRole);
  if ("error" in result) {
    return result;
  }
  return null;
}

/** Resolve the signed-in user for server actions (cookie session, not GoTrue round-trip). */
export async function getActionActor(
  organizationId: string,
): Promise<ActionActor | ActionActorError> {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return { error: "You must be signed in" };
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" };
  }

  return {
    supabase,
    user,
    orgRole: membership.org_role as OrgRole,
  };
}

export async function requireEditableActor(
  organizationId: string,
): Promise<ActionActor | ActionActorError> {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return actor;
  }

  if (!canEditResource(actor.orgRole, "default")) {
    return { error: "You do not have permission to edit this resource" };
  }

  return actor;
}

export async function requireAdminActor(
  organizationId: string,
): Promise<ActionActor | ActionActorError> {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return actor;
  }

  if (!canManageOrg(actor.orgRole)) {
    return { error: "Only organization admins can perform this action" };
  }

  const privilegedError = await applyAdminPrivilegedChecks(actor.orgRole);
  if (privilegedError) {
    return privilegedError;
  }

  return actor;
}

/** Matches process_pages RLS: org admin or team leader. */
export async function requireProcessMutator(
  organizationId: string,
  teamId: string | null | undefined,
): Promise<ActionActor | ActionActorError> {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return actor;
  }

  if (canManageOrg(actor.orgRole)) {
    const privilegedError = await applyAdminPrivilegedChecks(actor.orgRole);
    if (privilegedError) {
      return privilegedError;
    }
    return actor;
  }

  if (!teamId) {
    return { error: "You do not have permission to manage process pages" };
  }

  const { data: teamMember } = await actor.supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", actor.user.id)
    .maybeSingle();

  if (
    !teamMember ||
    !canManageTeam(actor.orgRole, teamMember.team_role as "leader" | "member" | "viewer")
  ) {
    return { error: "You do not have permission to manage process pages" };
  }

  return actor;
}

/** Org admin (with MFA step-up) or team leader for member-management mutations. */
export async function requireTeamMutator(
  organizationId: string,
  teamId: string,
): Promise<TeamMutatorActor | ActionActorError> {
  const actor = await getActionActor(organizationId);
  if ("error" in actor) {
    return actor;
  }

  if (canManageOrg(actor.orgRole)) {
    const privileged = await enforceAdminPrivilegedSession(actor.orgRole);
    if ("error" in privileged) {
      return privileged;
    }

    return { ...actor, teamRole: "leader" };
  }

  const { data: teamMember } = await actor.supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", actor.user.id)
    .maybeSingle();

  const teamRole = (teamMember?.team_role ?? "viewer") as TeamRole;

  if (!teamMember || !canManageTeam(actor.orgRole, teamRole)) {
    return { error: "You do not have permission to manage team members." };
  }

  return { ...actor, teamRole };
}

/** Per-request cached org actor lookup (for hot paths like scorecard). */
export const getCachedActionActor = cache(getActionActor);

export function isActionActorError(
  result: ActionActor | ActionActorError,
): result is ActionActorError {
  return "error" in result;
}
