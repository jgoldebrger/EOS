import Link from "next/link";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getActivityForOrg, getActivityDeepLink } from "@/features/activity/queries";
import { getAllTeamsForOrgListing } from "@/features/teams/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ entity?: string; action?: string; team?: string }>;
}) {
  const { orgSlug } = await params;
  const filters = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const teams = await getAllTeamsForOrgListing(access.orgId);
  const activity = await getActivityForOrg(access.orgId, {
    entityType: filters.entity,
    action: filters.action,
    teamId: filters.team,
  });

  const base = `/org/${orgSlug}/activity`;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader title="Activity" description="Recent organization activity with filters." />

      <form className="flex flex-wrap gap-2" method="get">
        <select
          name="entity"
          defaultValue={filters.entity ?? ""}
          className="h-9 rounded-md border px-2 text-sm"
        >
          <option value="">All entities</option>
          <option value="rocks">Rocks</option>
          <option value="issues">Issues</option>
          <option value="todos">Todos</option>
          <option value="meetings">Meetings</option>
          <option value="org_members">Members</option>
        </select>
        <select
          name="action"
          defaultValue={filters.action ?? ""}
          className="h-9 rounded-md border px-2 text-sm"
        >
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="invite">Invite</option>
        </select>
        <select
          name="team"
          defaultValue={filters.team ?? ""}
          className="h-9 rounded-md border px-2 text-sm"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md border px-3 text-sm">
          Filter
        </button>
        <Link href={base} className="flex h-9 items-center px-2 text-sm text-primary">
          Clear
        </Link>
      </form>

      {activity.length === 0 ? (
        <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity" description="Actions will appear here." />
      ) : (
        <ul className="space-y-2">
          {activity.map((entry) => {
            const deepLink = getActivityDeepLink(orgSlug, entry.entity_type, entry.entity_id);
            return (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{entry.actorName}</span>
                    {" "}
                    <span className="capitalize">{entry.action}</span>
                    {" "}
                    {deepLink ? (
                      <Link href={deepLink} className="text-primary hover:underline">
                        {entry.entity_type}
                      </Link>
                    ) : (
                      <span>{entry.entity_type}</span>
                    )}
                  </span>
                  <time className="shrink-0 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                </CardContent>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
