import Link from "next/link";
import { getTeamNavHref } from "@/components/layout/team-nav-config";
import type { TeamRatingTrendPoint } from "@/features/meetings/queries";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TeamOverviewProps {
  orgSlug: string;
  orgId: string;
  teamSlug: string;
  teamName: string;
  ratingTrend: TeamRatingTrendPoint[];
}

export function TeamOverview({
  orgSlug,
  teamSlug,
  teamName,
  ratingTrend,
}: TeamOverviewProps) {
  const tabs = [
    { label: "Scorecards", segment: "scorecard", description: "Weekly metrics and KPIs" },
    { label: "Rocks", segment: "rocks", description: "Quarterly priorities" },
    { label: "Issues", segment: "issues", description: "IDS issue list" },
    { label: "To-Dos", segment: "todos", description: "7-day accountable tasks" },
    { label: "Headlines", segment: "headlines", description: "Customer & employee wins" },
    { label: "People", segment: "people", description: "Team members and roles" },
    { label: "Process", segment: "process", description: "SOPs and procedures" },
  ];

  const latestRating = ratingTrend.at(-1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Team overview</h2>
          <p className="text-sm text-muted-foreground">
            Quick access to {teamName} operating tools.
          </p>
          {latestRating && latestRating.ratingCount > 0 ? (
            <p className="mt-2 text-sm">
              Last L10 rating:{" "}
              <span className="font-semibold tabular-nums">{latestRating.averageRating}/10</span>
              <span className="text-muted-foreground">
                {" "}
                ({latestRating.ratingCount} vote{latestRating.ratingCount === 1 ? "" : "s"})
              </span>
            </p>
          ) : null}
        </div>
        <Button asChild data-testid="team-run-l10-button">
          <Link href={getTeamNavHref(orgSlug, teamSlug, "l10")}>Run L10</Link>
        </Button>
      </div>

      {ratingTrend.length > 0 ? (
        <Card data-testid="team-rating-trend">
          <CardHeader>
            <CardTitle className="text-base">L10 rating trend</CardTitle>
            <CardDescription>Average meeting ratings (most recent on the right)</CardDescription>
          </CardHeader>
          <div className="flex items-end gap-2 px-6 pb-6">
            {ratingTrend.map((point) => (
              <div key={point.meetingId} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80"
                  style={{ height: `${Math.max(8, point.averageRating * 12)}px` }}
                  title={`${point.title}: ${point.averageRating}`}
                />
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {point.averageRating || "—"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tabs.map((tab) => (
          <Link key={tab.segment} href={getTeamNavHref(orgSlug, teamSlug, tab.segment)}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
