import { createClient } from "@/lib/supabase/server";

export interface DashboardSummary {
  metricsCount: number;
  openRocksCount: number;
  openIssuesCount: number;
  openTodosCount: number;
  meetingsCount: number;
  pendingSuggestionsCount: number;
}

async function countRows(
  table:
    | "scorecard_metrics"
    | "rocks"
    | "issues"
    | "todos"
    | "meetings"
    | "ai_suggestions",
  organizationId: string,
  filters?: { column: string; value: string }[],
): Promise<number> {
  const supabase = await createClient();

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  for (const filter of filters ?? []) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getDashboardSummary(
  organizationId: string,
): Promise<DashboardSummary> {
  const supabase = await createClient();

  const rocksQuery = supabase
    .from("rocks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .in("status", ["on_track", "off_track"]);

  const [
    metricsCount,
    rocksResult,
    openIssuesCount,
    openTodosCount,
    meetingsCount,
    pendingSuggestionsCount,
  ] = await Promise.all([
    countRows("scorecard_metrics", organizationId),
    rocksQuery,
    countRows("issues", organizationId, [{ column: "status", value: "open" }]),
    countRows("todos", organizationId, [{ column: "status", value: "open" }]),
    countRows("meetings", organizationId),
    countRows("ai_suggestions", organizationId, [
      { column: "status", value: "pending" },
    ]),
  ]);

  return {
    metricsCount,
    openRocksCount: rocksResult.count ?? 0,
    openIssuesCount,
    openTodosCount,
    meetingsCount,
    pendingSuggestionsCount,
  };
}
