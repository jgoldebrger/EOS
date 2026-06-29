import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { LiveMeetingShell } from "@/components/meetings/live-meeting-shell";
import { getMeetingById } from "@/features/meetings/queries";
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

  const canEdit = canEditResource(access.role, "meetings");

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <LiveMeetingShell
        organizationId={access.orgId}
        orgSlug={orgSlug}
        meeting={meeting}
        canEdit={canEdit}
      />
    </div>
  );
}
