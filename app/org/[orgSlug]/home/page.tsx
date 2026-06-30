import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { getDashboardSummary } from "@/features/dashboard/queries";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { Badge } from "@/components/ui/badge";

export default async function HomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [org, summary] = await Promise.all([
    getOrganizationBySlug(orgSlug),
    getDashboardSummary(access.orgId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="space-y-2">
        <Badge variant="secondary" className="w-fit capitalize">
          {access.role}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {org?.name ?? "Home"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Your operating system home — scorecard, rocks, issues, and team workspaces.
        </p>
      </div>
      <DashboardSummaryCards orgSlug={orgSlug} summary={summary} />
    </div>
  );
}
