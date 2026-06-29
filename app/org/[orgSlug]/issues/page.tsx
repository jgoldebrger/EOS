import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { TableLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { IssuesWorkspace } from "@/components/issues/issues-workspace";
import {
  getIssuesForOrg,
  getOrgMembersForIssues,
  getOrgTeamsForIssues,
} from "@/features/issues/queries";
import { canEditResource } from "@/lib/permissions/checks";

async function IssuesContent({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [issues, teams, members] = await Promise.all([
    getIssuesForOrg(access.orgId, { includeArchived: true }),
    getOrgTeamsForIssues(access.orgId),
    getOrgMembersForIssues(access.orgId),
  ]);

  const canCreate = canEditResource(access.role, "issues");

  return (
    <IssuesWorkspace
      organizationId={access.orgId}
      orgSlug={orgSlug}
      orgRole={access.role}
      currentUserId={user.id}
      canCreate={canCreate}
      issues={issues}
      teams={teams}
      members={members}
    />
  );
}

export default async function IssuesPage({
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
            <TableLoadingSkeleton rows={6} columns={6} />
          </div>
        }
      >
        <IssuesContent orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
}
