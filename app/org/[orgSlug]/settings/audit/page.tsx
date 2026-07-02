import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getActivityForOrg, getActivityDeepLink } from "@/features/activity/queries";
import { canManageOrg } from "@/lib/permissions/checks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SettingsAuditPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!canManageOrg(access.role)) {
    redirect(`/org/${orgSlug}/settings`);
  }

  const audit = await getActivityForOrg(access.orgId, { limit: 100 });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8" data-testid="settings-audit-log">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/org/${orgSlug}/settings`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Settings
        </Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">Security and admin actions for this organization.</p>
      </div>
      <ul className="space-y-2">
        {audit.map((entry) => {
          const link = getActivityDeepLink(orgSlug, entry.entity_type, entry.entity_id);
          return (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{entry.actorName}</span>{" "}
                  <span className="capitalize">{entry.action}</span>{" "}
                  {link ? (
                    <Link href={link} className="text-primary hover:underline">
                      {entry.entity_type}
                    </Link>
                  ) : (
                    entry.entity_type
                  )}
                </span>
                <time className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </CardContent>
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
