import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { getTeamsForOrg } from "@/features/teams/queries";
import { getUnreadInboxCount } from "@/features/inbox/queries";
import { OrgProvider } from "@/features/organizations/components/org-context";
import { TeamProvider } from "@/features/teams/components/team-context";
import { AppShell } from "@/components/layout/app-shell";
import { getServerSessionUser } from "@/lib/supabase/server";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const user = await getServerSessionUser();

  const [org, teams, inboxUnreadCount] = await Promise.all([
    getOrganizationBySlug(orgSlug),
    getTeamsForOrg(access.orgId),
    user ? getUnreadInboxCount(access.orgId, user.id) : Promise.resolve(0),
  ]);

  if (!org) {
    notFound();
  }

  return (
    <OrgProvider
      value={{
        orgId: access.orgId,
        orgSlug: access.orgSlug,
        role: access.role,
        orgName: org.name,
        inboxUnreadCount,
      }}
    >
      <TeamProvider teams={teams}>
        <AppShell>{children}</AppShell>
      </TeamProvider>
    </OrgProvider>
  );
}
