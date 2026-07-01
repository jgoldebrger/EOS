import { createClient } from "@/lib/supabase/server";

export async function getActivityForOrg(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, created_at, actor_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
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

export async function getProjectsForOrg(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects" as never)
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    team_id: string | null;
  }>;
}

export async function getReportsSummary(organizationId: string) {
  const supabase = await createClient();
  const [rocks, issues, todos, metrics] = await Promise.all([
    supabase.from("rocks").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open"),
    supabase.from("todos").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "open"),
    supabase
      .from("scorecard_metrics")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
  ]);

  return {
    rocks: rocks.count ?? 0,
    openIssues: issues.count ?? 0,
    openTodos: todos.count ?? 0,
    metrics: metrics.count ?? 0,
  };
}
