import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { TeamRole } from "@/types/domain";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { requireOrgAccess, type OrgAccessContext } from "@/lib/auth/require-org-access";

export interface TeamAccessContext extends OrgAccessContext {
  teamId: string;
  teamSlug: string;
  teamName: string;
  teamRole: TeamRole;
}

export const requireTeamAccess = cache(async (
  orgSlug: string,
  teamSlug: string,
): Promise<TeamAccessContext> => {
  const orgAccess = await requireOrgAccess(orgSlug);
  const supabase = await createClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, slug, name, organization_id")
    .eq("organization_id", orgAccess.orgId)
    .eq("slug", teamSlug)
    .maybeSingle();

  if (teamError || !team) {
    notFound();
  }

  const user = await getServerSessionUser();

  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", team.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOrgAdmin =
    orgAccess.role === "owner" || orgAccess.role === "admin";

  if (!membership && !isOrgAdmin) {
    redirect(`/org/${orgSlug}/teams`);
  }

  return {
    ...orgAccess,
    teamId: team.id,
    teamSlug: team.slug,
    teamName: team.name,
    teamRole: (membership?.team_role ?? "viewer") as TeamRole,
  };
});
