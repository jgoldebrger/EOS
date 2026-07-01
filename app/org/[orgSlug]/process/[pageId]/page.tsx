import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";
import { getProcessPageById } from "@/features/process/queries";
import { ProcessPageViewer } from "@/components/process/process-page-viewer";

export default async function OrgProcessViewPage({
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

  const base = `/org/${orgSlug}/process`;
  const canEdit = canManageOrg(access.role);

  return (
    <ProcessPageViewer
      page={page}
      backHref={base}
      editHref={canEdit ? `${base}/${pageId}/edit` : undefined}
    />
  );
}
