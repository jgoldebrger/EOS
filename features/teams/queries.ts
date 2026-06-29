import { createClient } from "@/lib/supabase/server";
import type { TeamWithRole } from "@/features/teams/types";
import type { TeamRole } from "@/types/domain";

export async function getTeamsForOrg(organizationId: string): Promise<TeamWithRole[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
