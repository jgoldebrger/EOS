import { notFound } from "next/navigation";
import { getProcessPageById } from "@/features/process/queries";
import { getSeatsForOrg } from "@/features/accountability/queries";
import { canManageOrg } from "@/lib/permissions/checks";
import { SopEditorShell } from "@/components/process/sop-editor-shell";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamProcessEditPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string; pageId: string }>;
}) {
  const { orgSlug, teamSlug, pageId } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const page = await getProcessPageById(ctx.orgId, pageId);
  const seats = await getSeatsForOrg(ctx.orgId);

  if (!page || page.team_id !== ctx.teamId) {
    notFound();
  }

  const canEdit = canManageOrg(ctx.orgRole) || ctx.isTeamLeader;
  if (!canEdit) {
    notFound();
  }

  const base = `/org/${orgSlug}/teams/${teamSlug}/process`;

  return (
    <SopEditorShell
      pageId={page.id}
      organizationId={ctx.orgId}
      orgSlug={orgSlug}
      teamId={ctx.teamId}
      teamSlug={teamSlug}
      initialTitle={page.title}
      initialDocument={page.sop_document}
      initialAccountabilitySeatId={page.accountability_seat_id}
      seats={seats.map((seat) => ({ id: seat.id, title: seat.title }))}
      readOnly={false}
      backHref={base}
    />
  );
}
