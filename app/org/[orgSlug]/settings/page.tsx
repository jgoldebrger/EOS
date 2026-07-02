import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Clock, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const org = await getOrganizationBySlug(orgSlug);

  if (!org) {
    redirect("/onboarding");
  }

  const canEdit = canManageOrg(access.role);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Organization profile and security configuration.
        </p>
      </div>

      <Card data-testid="user-profile-settings-link">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              Update your name and how you appear across the workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/org/${orgSlug}/profile`}>Edit profile</Link>
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="org-settings-profile">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Workspace identity and membership role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">URL slug</span>
            <code className="rounded bg-muted px-2 py-0.5 text-xs">/org/{org.slug}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Your role</span>
            <Badge variant="secondary" className="capitalize">
              {access.role}
            </Badge>
          </div>
          {!canEdit && (
            <p className="text-muted-foreground">
              Contact an organization owner or admin to change workspace settings.
            </p>
          )}
        </CardContent>
      </Card>

      <Card data-testid="l10-agenda-settings-link">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              L10 agenda
            </CardTitle>
            <CardDescription>
              Set time boxes for Segue, Scorecard, Rocks, IDS, and other L10 sections.
            </CardDescription>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/org/${orgSlug}/settings/l10`}>
              {canEdit ? "Manage L10 timings" : "View L10 timings"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Security
            </CardTitle>
            <CardDescription>
              Authentication, SSO, and enterprise access controls.
            </CardDescription>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={`/org/${orgSlug}/settings/security`}>Manage security</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
