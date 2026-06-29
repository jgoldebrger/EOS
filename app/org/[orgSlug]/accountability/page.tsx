import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { AccountabilityWorkspace } from "@/components/accountability/accountability-workspace";
import {
  buildSeatTree,
  getOrgMembersForAccountability,
  getSeatsForOrg,
} from "@/features/accountability/queries";
import { canManageOrg } from "@/lib/permissions/checks";

async function AccountabilityContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);

  const [seats, members] = await Promise.all([
    getSeatsForOrg(access.orgId),
    getOrgMembersForAccountability(access.orgId),
  ]);

  const tree = buildSeatTree(seats);
  const canManage = canManageOrg(access.role);

  return (
    <AccountabilityWorkspace
      organizationId={access.orgId}
      canManage={canManage}
      tree={tree}
      members={members}
    />
  );
}

export default async function AccountabilityPage({
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
              <div className="h-8 w-64 animate-pulse rounded bg-muted" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
        }
      >
        <AccountabilityContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
