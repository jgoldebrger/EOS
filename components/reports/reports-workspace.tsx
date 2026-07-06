"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ExecutiveReportsData } from "@/features/reports/types";
import { buildScorecardRollupCsv } from "@/features/reports/csv";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentQuarter } from "@/features/rocks/utils";

interface ReportsWorkspaceProps {
  orgSlug: string;
  summaryCards: Array<{ label: string; value: string | number }>;
  teamBreakdown: Array<{
    teamId: string;
    teamName: string;
    openIssues: number;
    activeRocks: number;
    doneRocks: number;
  }>;
  executive: ExecutiveReportsData;
  quarterOptions: string[];
}

export function ReportsWorkspace({
  orgSlug,
  summaryCards,
  teamBreakdown,
  executive,
  quarterOptions,
}: ReportsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quarter = searchParams.get("quarter") ?? executive.quarter ?? getCurrentQuarter();

  const csvContent = [
    ["Metric", "Value"],
    ...summaryCards.map((card) => [card.label, String(card.value)]),
    [],
    ...buildScorecardRollupCsv(executive.scorecardRollup)
      .split("\n")
      .map((line) => line.split(",")),
  ]
    .map((row) => row.join(","))
    .join("\n");

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8" data-testid="reports-page">
      <PageHeader
        title="Reports"
        description="Executive operating summaries, scorecard rollups, and team breakdown."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border px-2 text-sm"
              value={quarter}
              onChange={(event) =>
                router.push(`/org/${orgSlug}/reports?quarter=${event.target.value}`)
              }
              aria-label="Quarter"
            >
              {quarterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <Button asChild variant="outline" size="sm">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
                download={`${orgSlug}-reports-${quarter}.csv`}
              >
                Export CSV
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold tabular-nums">
              {card.value}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cascade ack rate
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">
            {executive.cascadeCompletion.completionPct}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IDS solve rate ({quarter})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">
            {executive.idsThroughput.solveRatePct}%
          </CardContent>
        </Card>
      </div>

      <Card data-testid="reports-scorecard-rollup">
        <CardHeader>
          <CardTitle className="text-lg">Scorecard rollup by team</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Metrics</th>
                <th className="pb-2 font-medium">Green</th>
                <th className="pb-2 font-medium">On-track %</th>
              </tr>
            </thead>
            <tbody>
              {executive.scorecardRollup.map((row) => (
                <tr key={row.teamId ?? "org"} className="border-b last:border-0">
                  <td className="py-2">{row.teamName}</td>
                  <td className="py-2 tabular-nums">{row.metricCount}</td>
                  <td className="py-2 tabular-nums">{row.greenCount}</td>
                  <td className="py-2 tabular-nums">{row.onTrackPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rock completion by team ({quarter})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {executive.rockCompletionByTeam.map((row) => (
              <div key={row.teamId ?? "org"} className="flex justify-between gap-4">
                <span>{row.teamName}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.done}/{row.total} ({row.completionPct}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="reports-rprs-panel">
          <CardHeader>
            <CardTitle className="text-lg">People Analyzer RPRS ({quarter})</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                {executive.rprsDistribution.green}
              </p>
              <p className="text-muted-foreground">Green</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-amber-600">
                {executive.rprsDistribution.yellow}
              </p>
              <p className="text-muted-foreground">Yellow</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-red-600">
                {executive.rprsDistribution.red}
              </p>
              <p className="text-muted-foreground">Red</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="reports-l10-trend">
        <CardHeader>
          <CardTitle className="text-lg">L10 rating trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {executive.l10RatingTrend.length === 0 ? (
            <p className="text-muted-foreground">No completed L10 ratings yet.</p>
          ) : (
            executive.l10RatingTrend.map((point, index) => (
              <div key={`${point.teamId}-${index}`} className="flex justify-between gap-4">
                <span>
                  {point.teamName} ·{" "}
                  {new Date(point.meetingDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-medium tabular-nums">{point.avgRating}/10</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Team</th>
                <th className="pb-2 font-medium">Open issues</th>
                <th className="pb-2 font-medium">Active rocks</th>
                <th className="pb-2 font-medium">Done rocks</th>
              </tr>
            </thead>
            <tbody>
              {teamBreakdown.map((row) => (
                <tr key={row.teamId} className="border-b last:border-0">
                  <td className="py-2">{row.teamName}</td>
                  <td className="py-2 tabular-nums">{row.openIssues}</td>
                  <td className="py-2 tabular-nums">{row.activeRocks}</td>
                  <td className="py-2 tabular-nums">{row.doneRocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card data-testid="reports-cascade-drilldown">
        <CardHeader>
          <CardTitle className="text-lg">Cascade deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {executive.cascadeDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cascade deliveries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Message</th>
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {executive.cascadeDeliveries.slice(0, 25).map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2">{row.sourceLabel}</td>
                    <td className="py-2">{row.targetTeamName}</td>
                    <td className="py-2 capitalize">{row.status}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(row.deliveredAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link href={`/org/${orgSlug}/activity`} className="text-primary hover:underline">
          View full activity log
        </Link>
      </p>
    </div>
  );
}
