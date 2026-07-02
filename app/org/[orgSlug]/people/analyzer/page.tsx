import { requireOrgAccess } from "@/lib/auth/require-org-access";
import {
  getCoreValuesForOrg,
  getOrgPeopleWithManagers,
  getPeopleReviewsForOrg,
} from "@/features/people/queries";
import { getSeatsForOrg } from "@/features/accountability/queries";
import { PeopleAnalyzer } from "@/components/people/people-analyzer";
import { PeoplePageTabs } from "@/components/people/people-page-tabs";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentQuarter } from "@/features/rocks/utils";
import { createClient } from "@/lib/supabase/server";

export default async function PeopleAnalyzerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const quarter = getCurrentQuarter();
  const [people, reviews, coreValues, seats] = await Promise.all([
    getOrgPeopleWithManagers(access.orgId),
    getPeopleReviewsForOrg(access.orgId, quarter),
    getCoreValuesForOrg(access.orgId),
    getSeatsForOrg(access.orgId),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader
        title="People Analyzer"
        description="Right Person (core values) and Right Seat (GWC) quarterly reviews."
      />
      <PeoplePageTabs orgSlug={orgSlug} />
      <PeopleAnalyzer
        organizationId={access.orgId}
        people={people}
        reviews={reviews}
        coreValues={coreValues}
        seats={seats.map((seat) => ({
          id: seat.id,
          title: seat.title,
          assignedUserId: seat.assigned_user_id,
        }))}
        canReview={access.role !== "viewer"}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
