import { createClient } from "@/lib/supabase/server";

export interface DashboardSummary {
  metricsCount: number;
  openRocksCount: number;
  openIssuesCount: number;
  openTodosCount: number;
  meetingsCount: number;
  pendingSuggestionsCount: number;
}

async function countRowsForUser(
  table: "scorecard_metrics" | "rocks" | "issues" | "todos",
  organizationId: string,
  userId: string,
  filters?: { column: string; value: string }[],
  nullColumns?: string[],
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("owner_id", userId);

  for (const filter of filters ?? []) {
    query = query.eq(filter.column, filter.value);
  }

  for (const column of nullColumns ?? []) {
    query = query.is(column, null);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getDashboardSummary(
  organizationId: string,
  userId: string,
): Promise<DashboardSummary> {
  const supabase = await createClient();

  const rocksQuery = supabase
    .from("rocks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("owner_id", userId)
    .is("archived_at", null)
    .in("status", ["on_track", "off_track"]);

  const meetingsQuery = supabase
    .from("meetings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("created_by", userId);

  const aiSuggestionsQuery = supabase
    .from("ai_suggestions")
    .select("id, ai_runs!inner(actor_id)", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .eq("ai_runs.actor_id", userId);

  const [
    metricsCount,
    rocksResult,
    openIssuesCount,
    openTodosCount,
    meetingsResult,
    aiSuggestionsResult,
  ] = await Promise.all([
    countRowsForUser("scorecard_metrics", organizationId, userId, undefined, [
      "archived_at",
    ]),
    rocksQuery,
    countRowsForUser("issues", organizationId, userId, [
      { column: "status", value: "open" },
    ]),
    countRowsForUser("todos", organizationId, userId, [
      { column: "status", value: "open" },
    ]),
    meetingsQuery,
    aiSuggestionsQuery,
  ]);

  return {
    metricsCount,
    openRocksCount: rocksResult.count ?? 0,
    openIssuesCount,
    openTodosCount,
    meetingsCount: meetingsResult.count ?? 0,
    pendingSuggestionsCount: aiSuggestionsResult.count ?? 0,
  };
}
