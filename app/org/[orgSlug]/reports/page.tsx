import Link from "next/link";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getReportsSummary, getTeamReportBreakdown } from "@/features/activity/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [summary, teamBreakdown] = await Promise.all([
    getReportsSummary(access.orgId),
    getTeamReportBreakdown(access.orgId),
  ]);

  const cards = [
    { label: "Active rocks", value: summary.rocks },
    { label: "Rock completion", value: `${summary.rockCompletionPct}%` },
    { label: "Open issues", value: summary.openIssues },
    { label: "Issues solved (7d)", value: summary.issuesSolvedThisWeek },
    { label: "Open to-dos", value: summary.openTodos },
    { label: "Scorecard metrics", value: summary.metrics },
  ];

  const csvRows = [
    ["Metric", "Value"],
    ...cards.map((card) => [card.label, String(card.value)]),
    [],
    ["Team", "Open issues", "Active rocks", "Done rocks"],
    ...teamBreakdown.map((row) => [
      row.teamName,
      String(row.openIssues),
      String(row.activeRocks),
      String(row.doneRocks),
    ]),
  ];
  const csvContent = csvRows.map((row) => row.join(",")).join("\n");

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8" data-testid="reports-page">
      <PageHeader
        title="Reports"
        description="Organization operating summaries and team breakdown."
        actions={
          <Button asChild variant="outline" size="sm">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
              download={`${orgSlug}-reports.csv`}
            >
              Export CSV
            </a>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
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
      </div>

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

      <p className="text-sm text-muted-foreground">
        <Link href={`/org/${orgSlug}/activity`} className="text-primary hover:underline">
          View full activity log
        </Link>
      </p>
    </div>
  );
}
