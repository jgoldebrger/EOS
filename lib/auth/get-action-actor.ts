import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { cache } from "react";
import {
  canEditResource,
  canManageOrg,
  canManageTeam,
} from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";

export type ActionActor = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: NonNullable<Awaited<ReturnType<typeof getServerSessionUser>>>;
  orgRole: OrgRole;
};

export type ActionActorError = { error: string };

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

/** Per-request cached org actor lookup (for hot paths like scorecard). */
export const getCachedActionActor = cache(getActionActor);

export function isActionActorError(
  result: ActionActor | ActionActorError,
): result is ActionActorError {
  return "error" in result;
}
