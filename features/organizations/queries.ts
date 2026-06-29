import { createClient } from "@/lib/supabase/server";
import type { OrganizationWithRole } from "@/features/organizations/types";
import type { OrgRole } from "@/types/domain";

export async function getOrganizationBySlug(
  slug: string,
): Promise<OrganizationWithRole | null> {
  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (orgError || !org) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError || !membership) {
    return null;
  }

  return {
    ...org,
    role: membership.org_role as OrgRole,
  };
}

export async function getUserOrganizations(): Promise<OrganizationWithRole[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("org_role, organizations(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !memberships) {
    return [];
  }

  return memberships
    .filter((row) => row.organizations !== null)
    .map((row) => ({
      ...(row.organizations as NonNullable<typeof row.organizations>),
      role: row.org_role as OrgRole,
    }));
}

export async function userHasOrganizations(): Promise<boolean> {
  const orgs = await getUserOrganizations();
  return orgs.length > 0;
}
