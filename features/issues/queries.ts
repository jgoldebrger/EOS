import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import type { ResolvedUser } from "@/lib/users/resolve-emails";
import type {
  Issue,
  IssueFilters,
  IssueMemberOption,
  IssueTeamOption,
  IssueWithLinks,
} from "@/features/issues/types";

function mapIssueRow(
  row: {
    teams: { name: string } | null;
    scorecard_metrics: { name: string } | null;
    rocks: { title: string } | null;
  } & Issue,
  ownerProfiles: Map<string, ResolvedUser>,
  priorityRank: number,
): IssueWithLinks {
  const { teams: teamJoin, scorecard_metrics: metricJoin, rocks: rockJoin, ...issue } = row;

  const ownerId = issue.owner_id;
  const ownerProfile = ownerId ? ownerProfiles.get(ownerId) : undefined;

  return {
    ...issue,
    teamName: teamJoin?.name ?? null,
    linkedMetricName: metricJoin?.name ?? null,
    linkedRockTitle: rockJoin?.title ?? null,
    owner: {
      userId: ownerId,
      label: ownerId
        ? ownerLabelFromProfiles(ownerProfiles, ownerId)
        : "Unassigned",
      email: ownerProfile?.email ?? null,
    },
    priorityRank,
  };
}

async function fetchIssues(
  organizationId: string,
  filters: IssueFilters = {},
): Promise<IssueWithLinks[]> {
  const supabase = await createClient();

  let query = supabase
    .from("issues")
    .select(
      "*, teams(name), scorecard_metrics(name), rocks(title)",
    )
    .eq("organization_id", organizationId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (!filters.includeArchived) {
    query = query.is("archived_at", null).neq("status", "archived");
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }

  const { data: issues, error } = await query;

  if (error || !issues) {
    return [];
  }

  const ownerProfiles = await resolveOwnerProfiles(
    issues.map((row) => row.owner_id),
  );

  return issues.map((row, index) =>
    mapIssueRow(row, ownerProfiles, index + 1),
  );
}

export async function getIssuesForOrg(
  organizationId: string,
  filters: IssueFilters = {},
): Promise<IssueWithLinks[]> {
  return fetchIssues(organizationId, filters);
}

export async function getOpenIssues(
  organizationId: string,
  filters: Omit<IssueFilters, "status" | "includeArchived"> = {},
): Promise<IssueWithLinks[]> {
  const supabase = await createClient();

  let query = supabase
    .from("issues")
    .select(
      "*, teams(name), scorecard_metrics(name), rocks(title)",
    )
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .in("status", ["open", "discussing"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }

  const { data: issues, error } = await query;

  if (error || !issues) {
    return [];
  }

  const ownerProfiles = await resolveOwnerProfiles(
    issues.map((row) => row.owner_id),
  );

  return issues.map((row, index) =>
    mapIssueRow(row, ownerProfiles, index + 1),
  );
}

export async function getOrgTeamsForIssues(
  organizationId: string,
): Promise<IssueTeamOption[]> {
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

export async function getOrgMembersForIssues(
  organizationId: string,
): Promise<IssueMemberOption[]> {
  return getOrgMemberOptions(organizationId);
}
