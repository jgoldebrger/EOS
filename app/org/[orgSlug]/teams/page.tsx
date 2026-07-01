import Link from "next/link";
import { getAllTeamsForOrgListing, getTeamsForOrg } from "@/features/teams/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamNavHref } from "@/components/layout/team-nav-config";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { UsersRound } from "lucide-react";

export default async function TeamsListPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const canManageTeams = canManageOrg(access.role);
  const teams = canManageTeams
    ? await getAllTeamsForOrgListing(access.orgId)
    : await getTeamsForOrg(access.orgId);
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader
        title="Teams"
        description="Open a team workspace to manage scorecards, rocks, issues, and more."
        actions={
          canManageTeams ? (
            <CreateTeamDialog
              organizationId={access.orgId}
              orgSlug={access.orgSlug}
            />
          ) : undefined
        }
      />
      {teams.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="No teams yet"
          description={
            canManageTeams
              ? "Create your first team to start using scorecards, rocks, and meetings."
              : "You are not on any teams yet. Ask an organization admin to add you to a team."
          }
          action={
            canManageTeams ? (
              <CreateTeamDialog
                organizationId={access.orgId}
                orgSlug={access.orgSlug}
              />
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={getTeamNavHref(orgSlug, team.slug, "overview")}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>/{team.slug}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
