import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { MeetingsListPage } from "@/components/meetings/meetings-list-page";
import {
  getMeetingsForOrg,
  getOrgTeamsForMeetings,
} from "@/features/meetings/queries";
import { canEditResource } from "@/lib/permissions/checks";

async function MeetingsContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);

  const [meetings, teams] = await Promise.all([
    getMeetingsForOrg(access.orgId),
    getOrgTeamsForMeetings(access.orgId),
  ]);

  const canEdit = canEditResource(access.role, "meetings");

  return (
    <MeetingsListPage
      organizationId={access.orgId}
      orgSlug={orgSlug}
      canEdit={canEdit}
      meetings={meetings}
      teams={teams}
    />
  );
}

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="space-y-2 border-b pb-6">
              <div className="h-8 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="h-64 animate-pulse rounded-lg bg-muted" />
              <div className="h-64 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        }
      >
        <MeetingsContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
