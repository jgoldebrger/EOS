import Link from "next/link";
import { ChevronLeft, Mail } from "lucide-react";
import { NotificationSmokeTestButton } from "@/components/settings/notification-smoke-test-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getNotificationEnvStatus } from "@/features/notifications/actions";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";

export default async function NotificationSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const canEdit = canManageOrg(access.role);
  const envStatus = await getNotificationEnvStatus();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/org/${orgSlug}/settings`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Verify email delivery and production configuration.
        </p>
      </div>

      <Card data-testid="notification-env-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5" />
            Production email path
          </CardTitle>
          <CardDescription>
            Vercel needs <code className="text-xs">SUPABASE_SECRET_KEY</code> so server actions can
            call the <code className="text-xs">send-notifications</code> edge function. Resend keys
            live on Supabase only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">SUPABASE_SECRET_KEY on this deployment</span>
            <span className="font-medium">{envStatus.hasSecretKey ? "Configured" : "Missing"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Supabase URL</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs">
              {envStatus.supabaseUrl ?? "Not set"}
            </code>
          </div>
          {canEdit ? (
            <NotificationSmokeTestButton organizationId={access.orgId} />
          ) : (
            <p className="text-muted-foreground">Admin access required to run smoke tests.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
