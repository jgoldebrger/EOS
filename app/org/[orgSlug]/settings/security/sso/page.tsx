import { headers } from "next/headers";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getSsoSettings } from "@/features/sso/queries";
import { SsoSettingsPanel } from "@/components/sso/sso-settings-panel";

export default async function SsoPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const bundle = await getSsoSettings(access.orgId);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const callbackUrl = `${protocol}://${host}/auth/callback?next=/org/${orgSlug}/dashboard`;

  return (
    <SsoSettingsPanel
      orgSlug={orgSlug}
      role={access.role}
      settings={bundle.settings}
      roleMappings={bundle.roleMappings}
      verifiedDomains={bundle.verifiedDomains}
      callbackUrl={callbackUrl}
    />
  );
}
