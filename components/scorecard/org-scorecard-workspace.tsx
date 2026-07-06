import Link from "next/link";
import type { ScorecardRollupRow } from "@/features/reports/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TeamLink {
  id: string;
  name: string;
  slug: string;
}

interface OrgScorecardWorkspaceProps {
  orgSlug: string;
  rollup: ScorecardRollupRow[];
  teams: TeamLink[];
}

export function OrgScorecardWorkspace({
  orgSlug,
  rollup,
  teams,
}: OrgScorecardWorkspaceProps) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const orgRow = rollup.find((row) => row.teamId === null);
  const teamRows = rollup.filter((row) => row.teamId !== null);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8" data-testid="org-scorecard-page">
      <PageHeader
        title="Organization Scorecard"
        description="Executive view of metric health across all teams. Drill into a team scorecard to update values."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/org/${orgSlug}/reports`}>Full reports</Link>
          </Button>
        }
      />

      {orgRow ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Organization-wide</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-muted-foreground">Metrics</p>
              <p className="text-2xl font-semibold tabular-nums">{orgRow.metricCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Green</p>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                {orgRow.greenCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Yellow / Red</p>
              <p className="text-2xl font-semibold tabular-nums">
                {orgRow.yellowCount} / {orgRow.redCount}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">On-track</p>
              <p className="text-2xl font-semibold tabular-nums">{orgRow.onTrackPct}%</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="org-scorecard-rollup-table">
        <CardHeader>
          <CardTitle className="text-lg">By team</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Metrics</th>
                <th className="pb-2 font-medium">Green</th>
                <th className="pb-2 font-medium">Yellow</th>
                <th className="pb-2 font-medium">Red</th>
                <th className="pb-2 font-medium">On-track %</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {teamRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-muted-foreground">
                    No team scorecard metrics yet.
                  </td>
                </tr>
              ) : (
                teamRows.map((row) => {
                  const team = row.teamId ? teamById.get(row.teamId) : undefined;
                  return (
                    <tr key={row.teamId ?? "org"} className="border-b last:border-0">
                      <td className="py-2">{row.teamName}</td>
                      <td className="py-2 tabular-nums">{row.metricCount}</td>
                      <td className="py-2 tabular-nums">{row.greenCount}</td>
                      <td className="py-2 tabular-nums">{row.yellowCount}</td>
                      <td className="py-2 tabular-nums">{row.redCount}</td>
                      <td className="py-2 tabular-nums">{row.onTrackPct}%</td>
                      <td className="py-2 text-right">
                        {team ? (
                          <Link
                            href={`/org/${orgSlug}/teams/${team.slug}/scorecard`}
                            className="text-primary hover:underline"
                          >
                            Open
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
