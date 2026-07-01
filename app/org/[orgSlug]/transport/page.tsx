import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import {
  getTransportMembers,
  getTransportWorkspace,
} from "@/features/transport/queries";
import { TransportWorkspace } from "@/components/transport/transport-workspace";

export default async function TransportPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [data, members] = await Promise.all([
    getTransportWorkspace(access.orgId),
    getTransportMembers(access.orgId),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <Suspense>
        <TransportWorkspace
          organizationId={access.orgId}
          orgSlug={orgSlug}
          orgRole={access.role}
          data={data}
          members={members}
        />
      </Suspense>
    </div>
  );
}
