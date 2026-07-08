import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { createClient } from "@/lib/supabase/server";
import { loadMfaStatus } from "@/lib/auth/mfa-client";
import { MfaSettingsPanel } from "@/components/security/mfa-settings-panel";

export default async function MfaSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const supabase = await createClient();
  const status = await loadMfaStatus(supabase);

  return (
    <MfaSettingsPanel
      orgSlug={orgSlug}
      orgRole={access.role}
      initialVerifiedFactor={"error" in status ? null : status.verifiedFactor}
      initialNeedsStepUp={"error" in status ? false : status.needsStepUp}
    />
  );
}
