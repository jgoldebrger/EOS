import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { ScorecardPageHeader } from "@/components/scorecard/scorecard-page-header";
import { ScorecardMetricTable } from "@/components/scorecard/scorecard-metric-table";
import { TableLoadingSkeleton } from "@/components/shared/loading-skeleton";
import {
  getMetricsForOrg,
  getOrgMembersForScorecard,
  getOrgTeamsForScorecard,
  getValuesForMetrics,
} from "@/features/scorecard/queries";
import { getLastNWeeks } from "@/features/scorecard/utils";
import { canManageOrg } from "@/lib/permissions/checks";

async function ScorecardContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const weeks = getLastNWeeks(13);
  const [metrics, teams, members] = await Promise.all([
    getMetricsForOrg(access.orgId),
    getOrgTeamsForScorecard(access.orgId),
    getOrgMembersForScorecard(access.orgId),
  ]);

  const valuesByMetric = await getValuesForMetrics(
    metrics.map((metric) => metric.id),
    weeks,
  );

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

  const canManageMetrics = canManageOrg(access.role) || isTeamLeader;

  return (
    <div className="space-y-8">
      <ScorecardPageHeader
        organizationId={access.orgId}
        canManageMetrics={canManageMetrics}
        teams={teams}
        members={members}
        defaultOwnerId={user.id}
      />
      <ScorecardMetricTable
        organizationId={access.orgId}
        orgRole={access.role}
        currentUserId={user.id}
        isTeamLeader={isTeamLeader}
        metrics={metrics}
        weeks={weeks}
        valuesByMetric={valuesByMetric}
      />
    </div>
  );
}

export default async function ScorecardPage({
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
            <TableLoadingSkeleton rows={6} columns={8} />
          </div>
        }
      >
        <ScorecardContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
