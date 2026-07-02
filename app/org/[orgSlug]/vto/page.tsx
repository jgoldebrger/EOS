import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { VtoEditor } from "@/components/vto/vto-editor";
import { bootstrapVtoSections } from "@/features/vto/actions";
import { getSnapshots, getVtoSections, getVtoTractionData } from "@/features/vto/queries";
import { canManageOrg } from "@/lib/permissions/checks";

async function VtoContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);
  const canManage = canManageOrg(access.role);

  if (canManage) {
    await bootstrapVtoSections({ organizationId: access.orgId });
  }

  const [sections, snapshots, traction] = await Promise.all([
    getVtoSections(access.orgId, { includeHidden: canManage }),
    getSnapshots(access.orgId),
    getVtoTractionData(access.orgId),
  ]);

  return (
    <VtoEditor
      organizationId={access.orgId}
      canManage={canManage}
      sections={sections}
      snapshots={snapshots}
      traction={traction}
    />
  );
}

export default async function VtoPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="space-y-2 border-b pb-6">
              <div className="h-8 w-72 animate-pulse rounded bg-muted" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        }
      >
        <VtoContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
