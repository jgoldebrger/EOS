import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrgPeopleWithManagers, getPeopleReviewsForOrg } from "@/features/people/queries";
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
  const [people, reviews] = await Promise.all([
    getOrgPeopleWithManagers(access.orgId),
    getPeopleReviewsForOrg(access.orgId, quarter),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader
        title="People"
        description="GWC reviews — Get it, Want it, Capacity to do the role."
      />
      <PeoplePageTabs orgSlug={orgSlug} />
      <PeopleAnalyzer
        organizationId={access.orgId}
        people={people}
        reviews={reviews}
        canReview={access.role !== "viewer"}
        currentUserId={user?.id ?? ""}
      />
    </div>
  );
}
