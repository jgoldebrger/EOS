import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { TableLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { RocksWorkspace } from "@/components/rocks/rocks-workspace";
import {
  getOrgMembersForRocks,
  getOrgTeamsForRocks,
  getRocksForOrg,
} from "@/features/rocks/queries";
import { canEditResource } from "@/lib/permissions/checks";

async function RocksContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [rocks, teams, members] = await Promise.all([
    getRocksForOrg(access.orgId),
    getOrgTeamsForRocks(access.orgId),
    getOrgMembersForRocks(access.orgId),
  ]);

  const { data: leaderMemberships } = await supabase
    .from("team_members")
    .select("team_id, team_role, teams!inner(organization_id)")
    .eq("user_id", user.id)
    .eq("team_role", "leader");

  const isTeamLeader =
    leaderMemberships?.some((row) => {
      const team = row.teams as { organization_id: string };
      return team.organization_id === access.orgId;
    }) ?? false;

  const canCreate = canEditResource(access.role, "rocks");

  return (
    <RocksWorkspace
      organizationId={access.orgId}
      orgRole={access.role}
      currentUserId={user.id}
      isTeamLeader={isTeamLeader}
      canCreate={canCreate}
      rocks={rocks}
      teams={teams}
      members={members}
    />
  );
}

export default async function RocksPage({
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
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <TableLoadingSkeleton rows={6} columns={7} />
          </div>
        }
      >
        <RocksContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
