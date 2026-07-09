import { createClient } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";
import { resolveDisplayName } from "@/lib/users/display-name";
import type { OrgRoleDb } from "@/types/database";

export interface OrgMemberOptionRow {
  userId: string;
  orgRole: OrgRoleDb;
  label: string;
}

export async function getOrgMemberOptions(
  organizationId: string,
): Promise<OrgMemberOptionRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, org_role")
    .eq("organization_id", organizationId)
    .in("org_role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  const profiles = await resolveUserEmails(
    data.map((member) => member.user_id),
    { organizationId },
  );

  return data.map((member) => ({
    userId: member.user_id,
    orgRole: member.org_role as OrgRoleDb,
    label:
      profiles.get(member.user_id)?.displayName ??
      resolveDisplayName({ userId: member.user_id }),
  }));
}
