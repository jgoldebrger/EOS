import { notFound, redirect } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { LiveMeetingShell } from "@/components/meetings/live-meeting-shell";
import { getMeetingById, getOrgTeamsForMeetings } from "@/features/meetings/queries";
import { getL10MeetingHref } from "@/features/meetings/utils";
import { canEditResource } from "@/lib/permissions/checks";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; meetingId: string }>;
}) {
  const { orgSlug, meetingId } = await params;
  const access = await requireOrgAccess(orgSlug);

  const meeting = await getMeetingById(access.orgId, meetingId);

  if (!meeting) {
    notFound();
  }

  if (meeting.team_id) {
    const teams = await getOrgTeamsForMeetings(access.orgId);
    const team = teams.find((row) => row.id === meeting.team_id);
    if (team) {
      redirect(getL10MeetingHref(orgSlug, team.slug, meetingId));
    }
  }

  const canEdit = canEditResource(access.role, "meetings");

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <LiveMeetingShell
        key={`${meeting.id}-${meeting.status}-${meeting.active_section_key ?? ""}`}
        organizationId={access.orgId}
        orgSlug={orgSlug}
        meeting={meeting}
        canEdit={canEdit}
      />
    </div>
  );
}
