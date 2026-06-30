import { RocksWorkspace } from "@/components/rocks/rocks-workspace";
import {
  getOrgMembersForRocks,
  getOrgTeamsForRocks,
  getRocksForOrg,
} from "@/features/rocks/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamRocksPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);

  const [rocks, teams, members] = await Promise.all([
    getRocksForOrg(ctx.orgId, { teamId: ctx.teamId }),
    getOrgTeamsForRocks(ctx.orgId),
    getOrgMembersForRocks(ctx.orgId),
  ]);

  return (
    <div className="p-8">
      <RocksWorkspace
        organizationId={ctx.orgId}
        orgRole={ctx.orgRole}
        currentUserId={ctx.userId}
        isTeamLeader={ctx.isTeamLeader}
        canCreate={ctx.canCreate}
        rocks={rocks}
        teams={teams}
        members={members}
      />
    </div>
  );
}
