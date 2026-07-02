import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrgPeopleWithManagers } from "@/features/people/queries";
import { PeopleList } from "@/components/people/people-list";
import { PeoplePageTabs } from "@/components/people/people-page-tabs";
import { AddPersonDialog } from "@/components/people/add-person-dialog";
import { CreateAccountDialog } from "@/components/people/create-account-dialog";
import { InvitePersonDialog } from "@/components/people/invite-person-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { canManageOrg } from "@/lib/permissions/checks";
import Link from "next/link";

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const people = await getOrgPeopleWithManagers(access.orgId);
  const canManage = canManageOrg(access.role);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <PageHeader
        title="People"
        description="Organization members, roles, and reporting lines."
        actions={
          <>
            {canManage ? (
              <div className="flex items-center gap-2">
                <AddPersonDialog organizationId={access.orgId} orgSlug={orgSlug} />
                <CreateAccountDialog organizationId={access.orgId} orgSlug={orgSlug} />
                <InvitePersonDialog organizationId={access.orgId} orgSlug={orgSlug} />
              </div>
            ) : null}
            <Link
              href={`/org/${orgSlug}/accountability`}
              className="text-sm text-primary hover:underline"
            >
              Accountability chart
            </Link>
          </>
        }
      />
      <PeoplePageTabs orgSlug={orgSlug} />
      <PeopleList
        organizationId={access.orgId}
        orgSlug={orgSlug}
        people={people}
        canManage={canManage}
      />
    </div>
  );
}
