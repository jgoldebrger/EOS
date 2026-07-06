import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getScorecardRollupForOrg } from "@/features/reports/queries";
import { getOrgTeamsForScorecard } from "@/features/scorecard/queries";
import { OrgScorecardWorkspace } from "@/components/scorecard/org-scorecard-workspace";

export default async function OrgScorecardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  const [rollup, teams] = await Promise.all([
    getScorecardRollupForOrg(access.orgId),
    getOrgTeamsForScorecard(access.orgId),
  ]);

  return (
    <Suspense fallback={<div className="p-8">Loading scorecard…</div>}>
      <OrgScorecardWorkspace
        orgSlug={orgSlug}
        rollup={rollup}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          slug: team.slug,
        }))}
      />
    </Suspense>
  );
}
