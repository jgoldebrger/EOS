import { ProcessWorkspace } from "@/components/process/process-workspace";
import { getProcessPagesForTeam } from "@/features/process/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamProcessPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const pages = await getProcessPagesForTeam(ctx.orgId, ctx.teamId);

  return (
    <div className="p-8">
      <ProcessWorkspace pages={pages} />
    </div>
  );
}
