import { IssuesWorkspace } from "@/components/issues/issues-workspace";
import {
  getIssuesForOrg,
  getOrgMembersForIssues,
  getOrgTeamsForIssues,
} from "@/features/issues/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamIssuesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);

  const [issues, teams, members] = await Promise.all([
    getIssuesForOrg(ctx.orgId, { teamId: ctx.teamId }),
    getOrgTeamsForIssues(ctx.orgId),
    getOrgMembersForIssues(ctx.orgId),
  ]);

  return (
    <div className="p-8">
      <IssuesWorkspace
        organizationId={ctx.orgId}
        orgSlug={ctx.orgSlug}
        orgRole={ctx.orgRole}
        currentUserId={ctx.userId}
        canCreate={ctx.canCreate}
        issues={issues}
        teams={teams}
        members={members}
      />
    </div>
  );
}
