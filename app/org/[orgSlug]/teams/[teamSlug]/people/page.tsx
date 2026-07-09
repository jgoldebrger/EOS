import { requireTeamAccess } from "@/lib/auth/require-team-access";
import {
  getOrgMembersAvailableForTeam,
  getTeamMembers,
} from "@/features/teams/queries";
import { getCoreValuesForOrg, getPeopleReviewsForTeam } from "@/features/people/queries";
import { getSeatsForOrg } from "@/features/accountability/queries";
import { PeopleAnalyzer } from "@/components/people/people-analyzer";
import { TeamPeopleWorkspace } from "@/components/teams/team-people-workspace";
import { getCurrentQuarter } from "@/features/rocks/utils";
import { getServerSessionUser } from "@/lib/supabase/server";
import { canManageTeam } from "@/lib/permissions/checks";

export default async function TeamPeoplePage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const access = await requireTeamAccess(orgSlug, teamSlug);
  const user = await getServerSessionUser();

  const quarter = getCurrentQuarter();

  const [members, availablePeople, reviews, coreValues, seats] = await Promise.all([
    getTeamMembers(access.teamId, access.orgId),
    getOrgMembersAvailableForTeam(access.orgId, access.teamId),
    getPeopleReviewsForTeam(access.orgId, access.teamId, quarter),
    getCoreValuesForOrg(access.orgId),
    getSeatsForOrg(access.orgId),
  ]);

  const canManage = canManageTeam(access.role, access.teamRole);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <TeamPeopleWorkspace
        teamId={access.teamId}
        organizationId={access.orgId}
        members={members}
        availablePeople={availablePeople}
        canManage={canManage}
      />
      <div className="space-y-4 border-t pt-8">
        <h2 className="text-lg font-medium">People Analyzer</h2>
        <PeopleAnalyzer
          organizationId={access.orgId}
          people={members.map((member) => ({
            userId: member.userId,
            orgRole: "member",
            reportsToUserId: null,
            displayName: member.displayName,
            managerName: null,
            seatTitle:
              seats.find((seat) => seat.assigned_user_id === member.userId)?.title ?? null,
          }))}
          reviews={reviews}
          coreValues={coreValues}
          seats={seats.map((seat) => ({
            id: seat.id,
            title: seat.title,
            assignedUserId: seat.assigned_user_id,
          }))}
          canReview={canManage}
          currentUserId={user?.id ?? ""}
        />
      </div>
    </div>
  );
}
