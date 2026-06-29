import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import { OrgProvider } from "@/features/organizations/components/org-context";
import { OrgHeader } from "@/components/layout/org-header";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const org = await getOrganizationBySlug(orgSlug);

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
      <div className="flex min-h-full flex-col">
        <OrgHeader orgName={org.name} orgSlug={orgSlug} />
        <main className="flex-1">{children}</main>
      </div>
    </OrgProvider>
  );
}
