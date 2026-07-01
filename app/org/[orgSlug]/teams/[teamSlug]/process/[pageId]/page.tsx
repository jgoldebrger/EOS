import { notFound } from "next/navigation";
import { getProcessPageById } from "@/features/process/queries";
import { canManageOrg } from "@/lib/permissions/checks";
import { ProcessPageViewer } from "@/components/process/process-page-viewer";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamProcessViewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string; pageId: string }>;
}) {
  const { orgSlug, teamSlug, pageId } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const page = await getProcessPageById(ctx.orgId, pageId);

  if (!page || page.team_id !== ctx.teamId) {
    notFound();
  }

  const base = `/org/${orgSlug}/teams/${teamSlug}/process`;
  const canEdit = canManageOrg(ctx.orgRole) || ctx.isTeamLeader;

  return (
    <ProcessPageViewer
      page={page}
      backHref={base}
      editHref={canEdit ? `${base}/${pageId}/edit` : undefined}
    />
  );
}
