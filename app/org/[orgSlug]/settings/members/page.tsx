import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrgPeopleWithManagers, getPendingOrgInvitations } from "@/features/people/queries";
import { MembersManagement } from "@/components/settings/members-management";
import { canManageOrg } from "@/lib/permissions/checks";
import { getServerSessionUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function SettingsMembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!canManageOrg(access.role)) {
    redirect(`/org/${orgSlug}/settings`);
  }

  const user = await getServerSessionUser();
  const members = await getOrgPeopleWithManagers(access.orgId);
  const pendingInvitations = await getPendingOrgInvitations(access.orgId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/org/${orgSlug}/settings`}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Settings
        </Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          Manage organization roles, invitations, and membership.
        </p>
      </div>
      <MembersManagement
        organizationId={access.orgId}
        orgSlug={orgSlug}
        members={members}
        currentUserId={user?.id ?? ""}
        pendingInvitations={pendingInvitations}
      />
    </div>
  );
}
