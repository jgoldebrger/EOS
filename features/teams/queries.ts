import { createClient, getServerSessionUser } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";
import type { OrgMemberOption, TeamMemberPerson, TeamWithRole } from "@/features/teams/types";
import type { TeamRole } from "@/types/domain";
export async function getTeamBySlug(
  organizationId: string,
  teamSlug: string,
): Promise<TeamWithRole | null> {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return null;
  }

  const { data: team, error } = await supabase
    .from("teams")
    .select("*, team_members(team_role, user_id)")
    .eq("organization_id", organizationId)
    .eq("slug", teamSlug)
    .maybeSingle();

  if (error || !team) {
    return null;
  }

  const members = team.team_members as { team_role: string; user_id: string }[];
  const userMember = members.find((m) => m.user_id === user.id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { team_members, ...teamRow } = team;

  return {
    ...teamRow,
    role: (userMember?.team_role ?? "viewer") as TeamWithRole["role"],
  };
}

export async function getAllTeamsForOrgListing(
  organizationId: string,
): Promise<TeamWithRole[]> {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return [];
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !teams) {
    return [];
  }

  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, team_role")
    .eq("user_id", user.id);

  const roleByTeam = new Map(
    (memberships ?? []).map((m) => [m.team_id, m.team_role as TeamWithRole["role"]]),
  );

  return teams.map((team) => ({
    ...team,
    role: roleByTeam.get(team.id) ?? "viewer",
  }));
}

export async function getTeamsForOrg(organizationId: string): Promise<TeamWithRole[]> {
  const supabase = await createClient();
  const user = await getServerSessionUser();

  if (!user) {
    return [];
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*, team_members!inner(team_role)")
    .eq("organization_id", organizationId)
    .eq("team_members.user_id", user.id)
    .order("name", { ascending: true });

  if (error || !teams) {
    return [];
  }

  return teams.map((row) => {
    const members = row.team_members as { team_role: string }[];
    const role = (members[0]?.team_role ?? "member") as TeamRole;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit join payload
    const { team_members, ...team } = row;
    return { ...team, role };
  });
}

export async function getTeamMembers(
  teamId: string,
  organizationId: string,
): Promise<TeamMemberPerson[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("id, user_id, team_role, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  const profiles = await resolveUserEmails(data.map((row) => row.user_id), {
    organizationId,
  });

  return data.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      teamRole: row.team_role as TeamRole,
      displayName: profile?.displayName ?? row.user_id.slice(0, 8),
      email: profile?.email ?? null,
      createdAt: row.created_at,
    };
  });
}

export async function getOrgMembersAvailableForTeam(
  organizationId: string,
  teamId: string,
): Promise<OrgMemberOption[]> {
  const supabase = await createClient();

  const [{ data: orgMembers }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, org_role")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true }),
    supabase.from("team_members").select("user_id").eq("team_id", teamId),
  ]);

  if (!orgMembers) {
    return [];
  }

  const onTeam = new Set((teamMembers ?? []).map((row) => row.user_id));
  const available = orgMembers.filter((row) => !onTeam.has(row.user_id));

  const profiles = await resolveUserEmails(available.map((row) => row.user_id), {
    organizationId,
  });

  return available.map((row) => {
    const profile = profiles.get(row.user_id);
    return {
      userId: row.user_id,
      orgRole: row.org_role,
      displayName: profile?.displayName ?? row.user_id.slice(0, 8),
      email: profile?.email ?? null,
    };
  });
}
