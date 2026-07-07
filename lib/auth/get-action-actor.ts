import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/domain";

/** Resolve the signed-in user for server actions (cookie session, not GoTrue round-trip). */
export async function getActionActor(organizationId: string) {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return { error: "You must be signed in" } as const;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" } as const;
  }

  return {
    supabase,
    user,
    orgRole: membership.org_role as OrgRole,
  } as const;
}
