import { requireTeamAccess } from "@/lib/auth/require-team-access";
import {
  getOrgMembersAvailableForTeam,
  getTeamMembers,
} from "@/features/teams/queries";
import { TeamPeopleWorkspace } from "@/components/teams/team-people-workspace";
import { canManageTeam } from "@/lib/permissions/checks";

export default async function TeamPeoplePage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const access = await requireTeamAccess(orgSlug, teamSlug);

  const [members, availablePeople] = await Promise.all([
    getTeamMembers(access.teamId),
    getOrgMembersAvailableForTeam(access.orgId, access.teamId),
  ]);

  const canManage = canManageTeam(access.role, access.teamRole);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <TeamPeopleWorkspace
        teamId={access.teamId}
        organizationId={access.orgId}
        members={members}
        availablePeople={availablePeople}
        canManage={canManage}
      />
    </div>
  );
}
