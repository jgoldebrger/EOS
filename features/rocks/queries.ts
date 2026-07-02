import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import type {
  RockFilters,
  RockMemberOption,
  RockMilestone,
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
  if (filters.rockType) {
    query = query.eq("rock_type", filters.rockType);
  }

  const { data: rocks, error } = await query;

  if (error || !rocks) {
    return [];
  }

  const ownerProfiles = await resolveOwnerProfiles(rocks.map((row) => row.owner_id));

  const mapped = rocks.map((row) => {
    const { teams: teamJoin, ...rock } = row;
    const team = teamJoin as { name: string } | null;
    const ownerId = rock.owner_id;
    const ownerProfile = ownerProfiles.get(ownerId);

    return {
      ...rock,
      teamName: team?.name ?? null,
      owner: {
        userId: ownerId,
        label: ownerLabelFromProfiles(ownerProfiles, ownerId),
        email: ownerProfile?.email ?? null,
      },
    };
  });

  return attachMilestonesToRocks(organizationId, mapped);
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

  const ownerProfiles = await resolveOwnerProfiles([row.owner_id]);
  const ownerId = row.owner_id;
  const ownerProfile = ownerProfiles.get(ownerId);
  const { teams: teamJoin, ...rock } = row;
  const team = teamJoin as { name: string } | null;

  const rockWithOwner: RockWithOwner = {
    ...rock,
    teamName: team?.name ?? null,
    owner: {
      userId: ownerId,
      label: ownerLabelFromProfiles(ownerProfiles, ownerId),
      email: ownerProfile?.email ?? null,
    },
  };

  const [withMilestones] = await attachMilestonesToRocks(organizationId, [rockWithOwner]);
  return withMilestones ?? null;
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

export async function getMilestonesForRocks(
  organizationId: string,
  rockIds: string[],
): Promise<Map<string, RockMilestone[]>> {
  const result = new Map<string, RockMilestone[]>();
  if (rockIds.length === 0) {
    return result;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rock_milestones")
    .select("*")
    .eq("organization_id", organizationId)
    .in("rock_id", rockIds)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return result;
  }

  for (const row of data) {
    const list = result.get(row.rock_id) ?? [];
    list.push(row);
    result.set(row.rock_id, list);
  }

  return result;
}

export async function attachMilestonesToRocks(
  organizationId: string,
  rocks: RockWithOwner[],
): Promise<RockWithOwner[]> {
  const milestoneMap = await getMilestonesForRocks(
    organizationId,
    rocks.map((rock) => rock.id),
  );

  return rocks.map((rock) => ({
    ...rock,
    milestones: milestoneMap.get(rock.id) ?? [],
  }));
}

export async function getOrgMembersForRocks(
  organizationId: string,
): Promise<RockMemberOption[]> {
  return getOrgMemberOptions(organizationId);
}
