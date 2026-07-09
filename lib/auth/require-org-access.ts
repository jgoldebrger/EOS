import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { OrgRole } from "@/types/domain";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";
import { requireMfaEnrollmentForRole, orgRequiresMfa } from "@/lib/auth/mfa-requirements";

export interface OrgAccessContext {
  orgId: string;
  orgSlug: string;
  role: OrgRole;
}

export const requireOrgAccess = cache(async (orgSlug: string): Promise<OrgAccessContext> => {
  await requireUser();

  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, settings")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (orgError || !org) {
    notFound();
  }

  const user = await getServerSessionUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    redirect("/request-access");
  }

  const orgRole = membership.org_role as OrgRole;
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const onMfaEnrollmentPage = pathname.includes("/settings/security/mfa");

  if (orgRequiresMfa(org.settings)) {
    const mfaRequirement = await requireMfaEnrollmentForRole(orgRole, org.settings);
    if ("error" in mfaRequirement && !onMfaEnrollmentPage) {
      redirect(`/org/${orgSlug}/settings/security/mfa?required=1`);
    }
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    role: orgRole,
  };
});
