import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";
import { getProcessPagesForOrg, getProcessHealthMetrics } from "@/features/process/queries";
import { getSeatsForOrg } from "@/features/accountability/queries";
import { ProcessWorkspace } from "@/components/process/process-workspace";
import { ProcessHealthBanner } from "@/components/process/process-health-banner";

export default async function OrgProcessPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [pages, health, seats] = await Promise.all([
    getProcessPagesForOrg(access.orgId, { includeArchived: true }),
    getProcessHealthMetrics(access.orgId),
    getSeatsForOrg(access.orgId),
  ]);
  const base = `/org/${orgSlug}/process`;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <ProcessHealthBanner metrics={health} />
      <ProcessWorkspace
        organizationId={access.orgId}
        orgSlug={orgSlug}
        teamId={null}
        canEdit={canManageOrg(access.role)}
        scopeLabel="Organization"
        pages={pages}
        processBasePath={base}
        seats={seats.map((seat) => ({ id: seat.id, title: seat.title }))}
      />
    </div>
  );
}
