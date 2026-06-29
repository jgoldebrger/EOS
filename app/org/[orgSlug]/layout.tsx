import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { getTeamsForOrg } from "@/features/teams/queries";
import { OrgProvider } from "@/features/organizations/components/org-context";
import { TeamProvider } from "@/features/teams/components/team-context";
import { AppShell } from "@/components/layout/app-shell";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [org, teams] = await Promise.all([
    getOrganizationBySlug(orgSlug),
    getTeamsForOrg(access.orgId),
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
      }}
    >
      <TeamProvider teams={teams}>
        <AppShell>{children}</AppShell>
      </TeamProvider>
    </OrgProvider>
  );
}
