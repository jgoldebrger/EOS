import { Suspense } from "react";
import { getServerSessionUser } from "@/lib/supabase/server";
import { requireTeamAccess } from "@/lib/auth/require-team-access";
import { ScorecardPageHeader } from "@/components/scorecard/scorecard-page-header";
import { ScorecardMetricTableSection } from "@/components/scorecard/scorecard-metric-table-section";
import { ScorecardToolbar } from "@/components/scorecard/scorecard-toolbar";
import { TableLoadingSkeleton } from "@/components/shared/loading-skeleton";
import {
  getCategoriesForOrg,
  getMetricsForOrg,
  getOrgMembersForScorecard,
  getOrgTeamsForScorecard,
  getTagsForOrg,
} from "@/features/scorecard/queries";
import { getPeriodColumns, type PeriodType } from "@/features/scorecard/utils";
import { canManageOrg } from "@/lib/permissions/checks";

async function TeamScorecardContent({
  orgSlug,
  teamSlug,
  searchParams,
}: {
  orgSlug: string;
  teamSlug: string;
  searchParams: Record<string, string | undefined>;
}) {
  const [access, user] = await Promise.all([
    requireTeamAccess(orgSlug, teamSlug),
    getServerSessionUser(),
  ]);

  if (!user) {
    return null;
  }

  const periodType = (searchParams.period ?? "weekly") as PeriodType;
  const range = Number(searchParams.range ?? "13");
  const groupBy = (searchParams.groupBy ?? "owner") as "owner" | "team" | "none";
  const periods = getPeriodColumns(periodType, range);

  const filters = {
    teamId: access.teamId,
    periodType,
    search: searchParams.q,
    state: (searchParams.state ?? "active") as "active" | "archived" | "all",
    categoryId:
      searchParams.category && searchParams.category !== "all"
        ? searchParams.category
        : undefined,
  };

  const [metrics, teams, members, categories, tags] = await Promise.all([
    getMetricsForOrg(access.orgId, filters),
    getOrgTeamsForScorecard(access.orgId),
    getOrgMembersForScorecard(access.orgId),
    getCategoriesForOrg(access.orgId, access.teamId),
    getTagsForOrg(access.orgId),
  ]);

  const isTeamLeader = access.teamRole === "leader";
  const canManageMetrics = canManageOrg(access.role) || isTeamLeader;

  return (
    <div className="space-y-6 p-8">
      <ScorecardToolbar
        organizationId={access.orgId}
        orgSlug={orgSlug}
        teamSlug={teamSlug}
        teamId={access.teamId}
        categories={categories}
        canManageMetrics={canManageMetrics}
      />
      <ScorecardPageHeader
        organizationId={access.orgId}
        orgSlug={orgSlug}
        teamSlug={teamSlug}
        canManageMetrics={canManageMetrics}
        teams={teams}
        members={members}
        categories={categories}
        tags={tags}
        defaultOwnerId={user.id}
        defaultTeamId={access.teamId}
      />
      <Suspense
        fallback={
          <TableLoadingSkeleton
            rows={Math.max(metrics.length, 4)}
            columns={Math.min(periods.length + 4, 12)}
          />
        }
      >
        <ScorecardMetricTableSection
          organizationId={access.orgId}
          orgSlug={orgSlug}
          teamSlug={teamSlug}
          orgRole={access.role}
          currentUserId={user.id}
          isTeamLeader={isTeamLeader}
          canManageMetrics={canManageMetrics}
          metrics={metrics}
          teams={teams}
          members={members}
          categories={categories}
          tags={tags}
          weeks={periods}
          groupBy={groupBy}
          periodType={periodType}
        />
      </Suspense>
    </div>
  );
}

export default async function TeamScorecardPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgSlug, teamSlug } = await params;
  const resolvedSearch = await searchParams;

  return (
    <Suspense fallback={<TableLoadingSkeleton rows={6} columns={8} />}>
      <TeamScorecardContent
        orgSlug={orgSlug}
        teamSlug={teamSlug}
        searchParams={resolvedSearch}
      />
    </Suspense>
  );
}
