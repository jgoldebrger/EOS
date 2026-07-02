import { createClient } from "@/lib/supabase/server";
import { resolveUserEmails } from "@/lib/users/resolve-emails";

import { getProjectsForOrg } from "@/features/projects/queries";

export interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
  actor_id: string | null;
  actorName: string;
}

export async function getActivityForOrg(
  organizationId: string,
  limit = 50,
): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, actor_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const actorIds = rows
    .map((row) => row.actor_id)
    .filter((id): id is string => Boolean(id));
  const resolved = await resolveUserEmails(actorIds);

  return rows.map((row) => ({
    ...row,
    actorName: row.actor_id
      ? (resolved.get(row.actor_id)?.displayName ?? row.actor_id.slice(0, 8))
      : "System",
  }));
}

export async function getPeopleForOrg(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("user_id, org_role, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export { getProjectsForOrg };

export async function getReportsSummary(organizationId: string) {
  const supabase = await createClient();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString();

  const [rocks, doneRocks, issues, solvedIssues, todos, metrics] = await Promise.all([
    supabase
      .from("rocks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
    supabase
      .from("rocks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "done")
      .is("archived_at", null),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "solved")
      .gte("updated_at", weekAgoIso),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "open"),
    supabase
      .from("scorecard_metrics")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
  ]);

  const activeRocks = rocks.count ?? 0;
  const completedRocks = doneRocks.count ?? 0;
  const rockTotal = activeRocks + completedRocks;

  return {
    rocks: activeRocks,
    rockCompletionPct: rockTotal > 0 ? Math.round((completedRocks / rockTotal) * 100) : 0,
    openIssues: issues.count ?? 0,
    issuesSolvedThisWeek: solvedIssues.count ?? 0,
    openTodos: todos.count ?? 0,
    metrics: metrics.count ?? 0,
  };
}
