import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { L10AgendaSettingsForm } from "@/components/meetings/l10-agenda-settings-form";
import { SeguePromptsSettingsForm } from "@/components/meetings/segue-prompts-settings-form";
import { getOrgL10AgendaTemplate, getOrgSeguePrompts } from "@/features/meetings/queries";
import { formatSectionDuration, getTotalAgendaMinutes } from "@/features/meetings/utils";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { canManageOrg } from "@/lib/permissions/checks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function L10AgendaSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [agenda, seguePrompts] = await Promise.all([
    getOrgL10AgendaTemplate(access.orgId),
    getOrgSeguePrompts(access.orgId),
  ]);
  const canEdit = canManageOrg(access.role);

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
        <h1 className="text-3xl font-semibold tracking-tight">L10 agenda timings</h1>
        <p className="text-muted-foreground">
          Configure how many minutes each section gets in your Level 10 meetings.
        </p>
      </div>

      <Card data-testid="l10-agenda-settings-card">
        <CardHeader>
          <CardTitle>Section time boxes</CardTitle>
          <CardDescription>
            Default total: {formatSectionDuration(getTotalAgendaMinutes(agenda))} across{" "}
            {agenda.length} sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <L10AgendaSettingsForm
            organizationId={access.orgId}
            orgSlug={orgSlug}
            initialAgenda={agenda}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      <Card data-testid="l10-segue-settings-card">
        <CardHeader>
          <CardTitle>Segue prompts</CardTitle>
          <CardDescription>
            Rotating personal and business best questions for the Segue section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeguePromptsSettingsForm
            organizationId={access.orgId}
            orgSlug={orgSlug}
            initialPrompts={seguePrompts}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
