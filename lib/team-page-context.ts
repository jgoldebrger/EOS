import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { requireTeamAccess } from "@/lib/auth/require-team-access";
import { canManageOrg, canEditResource } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";

export interface TeamPageContext {
  orgId: string;
  orgSlug: string;
  teamId: string;
  teamSlug: string;
  teamName: string;
  orgRole: OrgRole;
  userId: string;
  isTeamLeader: boolean;
  canCreate: boolean;
  canEdit: boolean;
}

export async function getTeamPageContext(
  orgSlug: string,
  teamSlug: string,
): Promise<TeamPageContext> {
  const access = await requireTeamAccess(orgSlug, teamSlug);
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: leaderMemberships } = await supabase
    .from("team_members")
    .select("team_id, team_role, teams!inner(organization_id)")
    .eq("user_id", user.id)
    .eq("team_role", "leader");

  const isTeamLeader =
    leaderMemberships?.some((row) => {
      const team = row.teams as { organization_id: string };
      return team.organization_id === access.orgId;
    }) ?? false;

  const canCreate =
    access.role !== "viewer" && (canManageOrg(access.role) || isTeamLeader);
  const canEdit = canEditResource(access.role, "rocks");

  return {
    orgId: access.orgId,
    orgSlug: access.orgSlug,
    teamId: access.teamId,
    teamSlug: access.teamSlug,
    teamName: access.teamName,
    orgRole: access.role,
    userId: user.id,
    isTeamLeader,
    canCreate,
    canEdit,
  };
}
