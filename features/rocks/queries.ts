import { createClient } from "@/lib/supabase/server";
import { formatOwnerLabel } from "@/features/scorecard/utils";
import type {
  RockFilters,
  RockMemberOption,
  RockTeamOption,
  RockWithOwner,
} from "@/features/rocks/types";
export async function getRocksForOrg(
  organizationId: string,
  filters: RockFilters = {},
): Promise<RockWithOwner[]> {
  const supabase = await createClient();

  let query = supabase
    .from("rocks")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("quarter", { ascending: false })
    .order("title", { ascending: true });

  if (filters.quarter) {
    query = query.eq("quarter", filters.quarter);
  }
  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }

  const { data: rocks, error } = await query;

  if (error || !rocks) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return rocks.map((row) => {
    const { teams: teamJoin, ...rock } = row;
    const team = teamJoin as { name: string } | null;
    const ownerId = rock.owner_id;
    const ownerEmail = user?.id === ownerId ? currentEmail : null;

    return {
      ...rock,
      teamName: team?.name ?? null,
      owner: {
        userId: ownerId,
        label: formatOwnerLabel(ownerId, ownerEmail),
        email: ownerEmail,
      },
    };
  });
}

export async function getRockById(
  organizationId: string,
  rockId: string,
): Promise<RockWithOwner | null> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("rocks")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .eq("id", rockId)
    .maybeSingle();

  if (error || !row) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerId = row.owner_id;
  const ownerEmail = user?.id === ownerId ? (user?.email ?? null) : null;
  const { teams: teamJoin, ...rock } = row;
  const team = teamJoin as { name: string } | null;

  return {
    ...rock,
    teamName: team?.name ?? null,
    owner: {
      userId: ownerId,
      label: formatOwnerLabel(ownerId, ownerEmail),
      email: ownerEmail,
    },
  };
}

export async function getOrgTeamsForRocks(
  organizationId: string,
): Promise<RockTeamOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOrgMembersForRocks(
  organizationId: string,
): Promise<RockMemberOption[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, org_role")
    .eq("organization_id", organizationId)
    .in("org_role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((member) => ({
    userId: member.user_id,
    orgRole: member.org_role,
    label:
      user?.id === member.user_id
        ? formatOwnerLabel(member.user_id, user.email)
        : formatOwnerLabel(member.user_id),
  }));
}
