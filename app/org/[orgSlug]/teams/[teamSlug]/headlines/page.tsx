import { HeadlinesWorkspace } from "@/components/headlines/headlines-workspace";
import { getHeadlinesForTeam } from "@/features/headlines/actions";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamHeadlinesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const headlines = await getHeadlinesForTeam(ctx.orgId, ctx.teamId);

  return (
    <div className="p-8">
      <HeadlinesWorkspace
        organizationId={ctx.orgId}
        teamId={ctx.teamId}
        canCreate={ctx.canCreate}
        headlines={headlines}
      />
    </div>
  );
}
