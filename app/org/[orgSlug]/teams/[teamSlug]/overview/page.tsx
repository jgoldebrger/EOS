import { requireTeamAccess } from "@/lib/auth/require-team-access";
import { getTeamMeetingRatingTrend } from "@/features/meetings/queries";
import { TeamOverview } from "@/components/teams/team-overview";

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const access = await requireTeamAccess(orgSlug, teamSlug);
  const ratingTrend = await getTeamMeetingRatingTrend(access.orgId, access.teamId);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <TeamOverview
        orgSlug={orgSlug}
        orgId={access.orgId}
        teamSlug={access.teamSlug}
        teamName={access.teamName}
        ratingTrend={ratingTrend}
      />
    </div>
  );
}
