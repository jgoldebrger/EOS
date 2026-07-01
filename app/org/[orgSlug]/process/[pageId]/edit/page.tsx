import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";
import { getProcessPageById } from "@/features/process/queries";
import { SopEditorShell } from "@/components/process/sop-editor-shell";

export default async function OrgProcessEditPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageId: string }>;
}) {
  const { orgSlug, pageId } = await params;
  const access = await requireOrgAccess(orgSlug);
  const page = await getProcessPageById(access.orgId, pageId);

  if (!page || page.team_id !== null) {
    notFound();
  }

  const canEdit = canManageOrg(access.role);
  if (!canEdit) {
    notFound();
  }

  return (
    <SopEditorShell
      pageId={page.id}
      organizationId={access.orgId}
      orgSlug={orgSlug}
      teamId={null}
      initialTitle={page.title}
      initialDocument={page.sop_document}
      readOnly={false}
      backHref={`/org/${orgSlug}/process`}
    />
  );
}
