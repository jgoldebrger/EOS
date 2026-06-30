import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getReportsSummary } from "@/features/activity/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const summary = await getReportsSummary(access.orgId);

  const cards = [
    { label: "Active rocks", value: summary.rocks },
    { label: "Open issues", value: summary.openIssues },
    { label: "Open to-dos", value: summary.openTodos },
    { label: "Scorecard metrics", value: summary.metrics },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Reports" description="Organization operating summaries." />
      <div className="grid gap-4 sm:grid-cols-2">
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
    </div>
  );
}
