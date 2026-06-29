import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const org = await getOrganizationBySlug(orgSlug);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <Badge variant="secondary" className="w-fit capitalize">
          {access.role}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          {org?.name ?? "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Welcome to your EOS workspace. Scorecards, rocks, and meetings arrive in
          upcoming waves.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Your organization is set up and protected. Only members can access this
            workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Workspace URL:{" "}
            <span className="font-mono text-foreground">/org/{orgSlug}/dashboard</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
