import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";
import { getProcessPagesForOrg } from "@/features/process/queries";
import { ProcessWorkspace } from "@/components/process/process-workspace";

export default async function OrgProcessPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const pages = await getProcessPagesForOrg(access.orgId);
  const base = `/org/${orgSlug}/process`;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <ProcessWorkspace
        organizationId={access.orgId}
        orgSlug={orgSlug}
        teamId={null}
        canEdit={canManageOrg(access.role)}
        scopeLabel="Organization"
        pages={pages}
        processBasePath={base}
      />
    </div>
  );
}
