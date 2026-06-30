import { redirect } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getTeamsForOrg } from "@/features/teams/queries";
import { getTeamNavHref } from "@/components/layout/team-nav-config";

export async function redirectToTeamTab(orgSlug: string, tab: string) {
  const access = await requireOrgAccess(orgSlug);
  const teams = await getTeamsForOrg(access.orgId);

  if (teams.length === 0) {
    redirect(`/org/${orgSlug}/teams`);
  }

  const slug = teams[0].slug;
  redirect(getTeamNavHref(orgSlug, slug, tab));
}
