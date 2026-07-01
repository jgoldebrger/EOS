import { ProcessWorkspace } from "@/components/process/process-workspace";
import { getProcessPagesForTeam } from "@/features/process/queries";
import { canManageOrg } from "@/lib/permissions/checks";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamProcessPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const pages = await getProcessPagesForTeam(ctx.orgId, ctx.teamId);
  const base = `/org/${orgSlug}/teams/${teamSlug}/process`;
  const canEdit = canManageOrg(ctx.orgRole) || ctx.isTeamLeader;

  return (
    <div className="p-8">
      <ProcessWorkspace
        organizationId={ctx.orgId}
        orgSlug={orgSlug}
        teamId={ctx.teamId}
        teamSlug={teamSlug}
        canEdit={canEdit}
        scopeLabel={ctx.teamName}
        pages={pages}
        viewHref={(id) => `${base}/${id}`}
        editHref={(id) => `${base}/${id}/edit`}
      />
    </div>
  );
}
