import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { OrgRole } from "@/types/domain";
import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/require-user";

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
    .select("id, slug")
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
    redirect("/onboarding");
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    role: membership.org_role as OrgRole,
  };
});
