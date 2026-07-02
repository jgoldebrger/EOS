import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getReportsSummary, getTeamReportBreakdown } from "@/features/activity/queries";
import { getExecutiveReportsData } from "@/features/reports/queries";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getCurrentQuarter } from "@/features/rocks/utils";

function buildQuarterOptions(): string[] {
  const current = getCurrentQuarter();
  const match = current.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return [current];

  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const options: string[] = [];

  for (let offset = 0; offset < 8; offset += 1) {
    let q = quarter - offset;
    let y = year;
    while (q < 1) {
      q += 4;
      y -= 1;
    }
    options.push(`${y}-Q${q}`);
  }

  return options;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ quarter?: string }>;
}) {
  const { orgSlug } = await params;
  const { quarter: quarterParam } = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const quarter = quarterParam ?? getCurrentQuarter();

  const [summary, teamBreakdown, executive] = await Promise.all([
    getReportsSummary(access.orgId),
    getTeamReportBreakdown(access.orgId),
    getExecutiveReportsData(access.orgId, quarter),
  ]);

  const summaryCards = [
    { label: "Active rocks", value: summary.rocks },
    { label: "Rock completion", value: `${summary.rockCompletionPct}%` },
    { label: "Open issues", value: summary.openIssues },
    { label: "Issues solved (7d)", value: summary.issuesSolvedThisWeek },
    { label: "Open to-dos", value: summary.openTodos },
    { label: "Scorecard metrics", value: summary.metrics },
  ];

  return (
    <Suspense fallback={<div className="p-8">Loading reports…</div>}>
      <ReportsWorkspace
        orgSlug={orgSlug}
        summaryCards={summaryCards}
        teamBreakdown={teamBreakdown}
        executive={executive}
        quarterOptions={buildQuarterOptions()}
      />
    </Suspense>
  );
}
