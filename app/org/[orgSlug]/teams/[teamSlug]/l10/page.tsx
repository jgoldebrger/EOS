import { Suspense } from "react";
import { L10Hub } from "@/components/meetings/l10-hub";
import {
  getInProgressMeetingForTeam,
  getMeetingsForTeam,
  getOrgL10AgendaTemplate,
} from "@/features/meetings/queries";
import { getMeetingScheduleForTeam } from "@/features/meetings/schedule-queries";
import { getTeamPageContext } from "@/lib/team-page-context";
import { canEditResource, canManageOrg } from "@/lib/permissions/checks";

export default async function TeamL10Page({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);

  const [meetings, inProgressMeeting, agendaTemplate, schedule] = await Promise.all([
    getMeetingsForTeam(ctx.orgId, ctx.teamId),
    getInProgressMeetingForTeam(ctx.orgId, ctx.teamId),
    getOrgL10AgendaTemplate(ctx.orgId),
    getMeetingScheduleForTeam(ctx.orgId, ctx.teamId),
  ]);

  const canEdit = canEditResource(ctx.orgRole, "meetings");
  const canManageAgenda = canManageOrg(ctx.orgRole);

  return (
    <div className="p-8">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading L10…</div>}>
        <L10Hub
          organizationId={ctx.orgId}
          orgSlug={ctx.orgSlug}
          teamSlug={ctx.teamSlug}
          teamId={ctx.teamId}
          teamName={ctx.teamName}
          canEdit={canEdit}
          canManageAgenda={canManageAgenda}
          agendaTemplate={agendaTemplate}
          meetings={meetings}
          inProgressMeeting={inProgressMeeting}
          schedule={schedule}
        />
      </Suspense>
    </div>
  );
}
