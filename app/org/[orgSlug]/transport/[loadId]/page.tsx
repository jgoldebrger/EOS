import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import {
  getLinkableEntitiesForTransport,
  getTransportLoadDetail,
  getTransportWorkspace,
} from "@/features/transport/queries";
import { LoadDetailWorkspace } from "@/components/transport/load-detail-workspace";

export default async function TransportLoadPage({
  params,
}: {
  params: Promise<{ orgSlug: string; loadId: string }>;
}) {
  const { orgSlug, loadId } = await params;
  const access = await requireOrgAccess(orgSlug);

  const [load, workspace, linkables] = await Promise.all([
    getTransportLoadDetail(access.orgId, loadId),
    getTransportWorkspace(access.orgId),
    getLinkableEntitiesForTransport(access.orgId),
  ]);

  if (!load) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <LoadDetailWorkspace
        organizationId={access.orgId}
        orgSlug={orgSlug}
        orgRole={access.role}
        load={load}
        depots={workspace.depots.map((d) => ({
          id: d.id,
          name: d.name,
          latitude: d.latitude,
          longitude: d.longitude,
        }))}
        linkableProjects={linkables.projects}
        linkableIssues={linkables.issues}
        linkableTodos={linkables.todos}
      />
    </div>
  );
}
