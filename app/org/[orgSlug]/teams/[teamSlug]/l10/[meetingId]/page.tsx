import { notFound } from "next/navigation";
import { LiveMeetingShell } from "@/components/meetings/live-meeting-shell";
import { L10SectionPanel } from "@/components/meetings/l10-section-panel";
import { getMeetingById } from "@/features/meetings/queries";
import { getFirstSectionKey } from "@/features/meetings/utils";
import { getTeamPageContext } from "@/lib/team-page-context";
import { canEditResource } from "@/lib/permissions/checks";

export default async function TeamL10MeetingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string; meetingId: string }>;
}) {
  const { orgSlug, teamSlug, meetingId } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const meeting = await getMeetingById(ctx.orgId, meetingId);

  if (!meeting || meeting.team_id !== ctx.teamId) {
    notFound();
  }

  const canEdit = canEditResource(ctx.orgRole, "meetings");
  const sectionKey =
    meeting.active_section_key ?? getFirstSectionKey(meeting.agenda);

  return (
    <div className="mx-auto max-w-[1400px] p-4 md:p-8">
      <LiveMeetingShell
        key={`${meeting.id}-${meeting.status}-${sectionKey}`}
        organizationId={ctx.orgId}
        orgSlug={ctx.orgSlug}
        teamSlug={ctx.teamSlug}
        meeting={meeting}
        canEdit={canEdit}
        sectionPanel={
          <L10SectionPanel
            sectionKey={sectionKey}
            organizationId={ctx.orgId}
            orgSlug={ctx.orgSlug}
            teamSlug={ctx.teamSlug}
            teamId={ctx.teamId}
            orgRole={ctx.orgRole}
            userId={ctx.userId}
            isTeamLeader={ctx.isTeamLeader}
            meetingId={meeting.id}
            canCreate={ctx.canCreate}
          />
        }
      />
    </div>
  );
}
