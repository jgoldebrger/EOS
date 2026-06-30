import { MeetingsListPage } from "@/components/meetings/meetings-list-page";
import {
  getMeetingsForOrg,
  getOrgTeamsForMeetings,
} from "@/features/meetings/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamAgendasPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);

  const allMeetings = await getMeetingsForOrg(ctx.orgId);
  const meetings = allMeetings.filter((m) => m.team_id === ctx.teamId);
  const teams = await getOrgTeamsForMeetings(ctx.orgId);

  return (
    <div className="p-8">
      <MeetingsListPage
        organizationId={ctx.orgId}
        orgSlug={ctx.orgSlug}
        canEdit={ctx.canCreate}
        meetings={meetings}
        teams={teams}
      />
    </div>
  );
}
