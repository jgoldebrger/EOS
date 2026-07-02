import { HeadlinesWorkspace } from "@/components/headlines/headlines-workspace";
import { getHeadlinesForTeam } from "@/features/headlines/actions";
import { getTeamPageContext } from "@/lib/team-page-context";
import { createClient } from "@/lib/supabase/server";

export default async function TeamHeadlinesPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const supabase = await createClient();
  const [headlines, teamsResult] = await Promise.all([
    getHeadlinesForTeam(ctx.orgId, ctx.teamId),
    supabase
      .from("teams")
      .select("id, name")
      .eq("organization_id", ctx.orgId)
      .neq("id", ctx.teamId),
  ]);

  return (
    <div className="p-8">
      <HeadlinesWorkspace
        organizationId={ctx.orgId}
        orgSlug={orgSlug}
        teamId={ctx.teamId}
        canCreate={ctx.canCreate}
        headlines={headlines}
        targetTeams={teamsResult.data ?? []}
      />
    </div>
  );
}
