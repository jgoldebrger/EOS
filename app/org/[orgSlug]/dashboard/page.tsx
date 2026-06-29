import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { getDashboardSummary } from "@/features/dashboard/queries";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";

export default async function DashboardPage({
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
          {org?.name ?? "Dashboard"}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Your EOS command center — jump into scorecard, rocks, issues, todos, and
          meetings from one place.
        </p>
      </div>

      <DashboardSummaryCards orgSlug={orgSlug} summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>
            Core traction tools and organization settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/org/${orgSlug}/accountability`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Accountability chart
          </Link>
          <Link
            href={`/org/${orgSlug}/vto`}
            className="text-primary underline-offset-4 hover:underline"
          >
            V/TO
          </Link>
          <Link
            href={`/org/${orgSlug}/settings`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Organization settings
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
