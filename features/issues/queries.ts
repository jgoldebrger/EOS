import { createClient } from "@/lib/supabase/server";
import { formatOwnerLabel } from "@/features/scorecard/utils";
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
  currentUserId: string | undefined,
  currentEmail: string | null,
  priorityRank: number,
): IssueWithLinks {
  const { teams: teamJoin, scorecard_metrics: metricJoin, rocks: rockJoin, ...issue } = row;

  const ownerId = issue.owner_id;
  const ownerEmail = currentUserId === ownerId ? currentEmail : null;

  return {
    ...issue,
    teamName: teamJoin?.name ?? null,
    linkedMetricName: metricJoin?.name ?? null,
    linkedRockTitle: rockJoin?.title ?? null,
    owner: {
      userId: ownerId,
      label: ownerId ? formatOwnerLabel(ownerId, ownerEmail) : "Unassigned",
      email: ownerEmail,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return issues.map((row, index) =>
    mapIssueRow(row, user?.id, currentEmail, index + 1),
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return issues.map((row, index) =>
    mapIssueRow(row, user?.id, currentEmail, index + 1),
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
