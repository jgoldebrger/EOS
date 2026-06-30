import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getActivityForOrg } from "@/features/activity/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const activity = await getActivityForOrg(access.orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader title="Activity" description="Recent organization activity." />
      {activity.length === 0 ? (
        <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity" description="Actions will appear here." />
      ) : (
        <ul className="space-y-2">
          {activity.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span>
                  <span className="font-medium capitalize">{entry.action}</span>
                  {" · "}
                  {entry.entity_type}
                </span>
                <time className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
