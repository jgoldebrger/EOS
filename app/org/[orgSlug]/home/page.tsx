import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { getHomeDashboardData } from "@/features/dashboard/queries";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { requireUser } from "@/lib/auth/require-user";
import { Badge } from "@/components/ui/badge";

export default async function HomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [access, user] = await Promise.all([requireOrgAccess(orgSlug), requireUser()]);
  const [org, dashboard] = await Promise.all([
    getOrganizationBySlug(orgSlug),
    getHomeDashboardData(access.orgId, user.id, orgSlug),
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
          Your operating system home — my work, team pulse, and company health.
        </p>
      </div>
      <HomeDashboard orgSlug={orgSlug} data={dashboard} />
    </div>
  );
}
