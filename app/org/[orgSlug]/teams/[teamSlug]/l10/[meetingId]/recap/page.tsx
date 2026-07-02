import { notFound } from "next/navigation";
import { MeetingRecapView } from "@/components/meetings/meeting-recap-view";
import { getMeetingRecapData } from "@/features/meetings/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamL10RecapPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string; meetingId: string }>;
}) {
  const { orgSlug, teamSlug, meetingId } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);
  const recap = await getMeetingRecapData(ctx.orgId, meetingId);

  if (!recap || recap.meeting.team_id !== ctx.teamId) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1000px] p-4 md:p-8">
      <MeetingRecapView
        organizationId={ctx.orgId}
        orgSlug={ctx.orgSlug}
        teamSlug={ctx.teamSlug}
        recap={recap}
      />
    </div>
  );
}
