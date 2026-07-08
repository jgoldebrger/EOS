import Link from "next/link";
import { RocksWorkspace } from "@/components/rocks/rocks-workspace";
import {
  attachMilestonesToRocks,
  getOrgMembersForRocks,
  getOrgTeamsForRocks,
  getRocksForOrg,
} from "@/features/rocks/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getServerSessionUser } from "@/lib/supabase/server";
import { canEditResource, canManageOrg } from "@/lib/permissions/checks";

export default async function CompanyRocksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const user = await getServerSessionUser();

  if (!user) {
    return null;
  }

  const [rocksRaw, teams, members] = await Promise.all([
    getRocksForOrg(access.orgId, { rockType: "company" }),
    getOrgTeamsForRocks(access.orgId),
    getOrgMembersForRocks(access.orgId),
  ]);
  const rocks = await attachMilestonesToRocks(access.orgId, rocksRaw);

  const canCreate =
    access.role !== "viewer" && canManageOrg(access.role);

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link
          href={`/org/${orgSlug}/company`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Company
        </Link>
      </div>
      <RocksWorkspace
        organizationId={access.orgId}
        orgRole={access.role}
        currentUserId={user.id}
        isTeamLeader={false}
        canCreate={canCreate && canEditResource(access.role, "rocks")}
        rocks={rocks}
        teams={teams}
        members={members}
        scope="company"
      />
    </div>
  );
}
