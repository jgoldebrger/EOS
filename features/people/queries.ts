import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";

export interface OrgPersonWithManager {
  userId: string;
  orgRole: string;
  reportsToUserId: string | null;
  displayName: string;
  managerName: string | null;
}

export async function getOrgPeopleWithManagers(
  organizationId: string,
): Promise<OrgPersonWithManager[]> {
  return getOrgPeopleWithManagersCached(organizationId);
}

const getOrgPeopleWithManagersCached = cache(
  async (organizationId: string): Promise<OrgPersonWithManager[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("user_id, org_role, reports_to_user_id, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    const userIds = data.flatMap((row) =>
      [row.user_id, row.reports_to_user_id].filter((id): id is string => Boolean(id)),
    );
    const resolved = await resolveUserEmails(userIds);

    return data.map((row) => {
      const person = resolved.get(row.user_id);
      const manager = row.reports_to_user_id
        ? resolved.get(row.reports_to_user_id)
        : null;

      return {
        userId: row.user_id,
        orgRole: row.org_role,
        reportsToUserId: row.reports_to_user_id,
        displayName: person?.displayName ?? row.user_id.slice(0, 8),
        managerName: manager?.displayName ?? null,
      };
    });
  },
);

export async function getSubordinateUserIds(
  organizationId: string,
  managerUserId: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("reports_to_user_id", managerUserId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.user_id);
}
