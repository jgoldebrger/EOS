import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getInboxForUser } from "@/features/inbox/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { InboxWorkspace } from "@/components/inbox/inbox-workspace";

export default async function InboxPage({
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

  const items = user
    ? await getInboxForUser(access.orgId, user.id, { includeArchived: true })
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader title="Inbox" description="Items assigned to you." />
      {user ? (
        <InboxWorkspace
          organizationId={access.orgId}
          orgSlug={orgSlug}
          items={items}
        />
      ) : null}
    </div>
  );
}
