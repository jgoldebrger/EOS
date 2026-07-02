import { createClient } from "@/lib/supabase/server";
import { getReportsSummary } from "@/features/activity/queries";
import { getTeamsForOrg } from "@/features/teams/queries";

export interface DashboardSummary {
  metricsCount: number;
  openRocksCount: number;
  openIssuesCount: number;
  openTodosCount: number;
  meetingsCount: number;
  pendingSuggestionsCount: number;
}

export interface HomeDashboardData {
  summary: DashboardSummary;
  overdueTodos: Array<{ id: string; title: string; due_date: string | null }>;
  offTrackRocks: Array<{ id: string; title: string; status: string }>;
  assignedIssues: Array<{ id: string; title: string; status: string }>;
  teamPulse: Array<{
    teamId: string;
    teamName: string;
    teamSlug: string;
    rockCompletionPct: number;
    openIssues: number;
    lastL10Rating: number | null;
  }>;
  companySnapshot: Awaited<ReturnType<typeof getReportsSummary>>;
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

export async function getHomeDashboardData(
  organizationId: string,
  userId: string,
  orgSlug: string,
): Promise<HomeDashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [summary, overdueTodos, offTrackRocks, assignedIssues, companySnapshot, teams] =
    await Promise.all([
      getDashboardSummary(organizationId, userId),
      supabase
        .from("todos")
        .select("id, title, due_date")
        .eq("organization_id", organizationId)
        .eq("owner_id", userId)
        .eq("status", "open")
        .lt("due_date", today)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("rocks")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .eq("owner_id", userId)
        .eq("status", "off_track")
        .is("archived_at", null)
        .limit(5),
      supabase
        .from("issues")
        .select("id, title, status")
        .eq("organization_id", organizationId)
        .eq("owner_id", userId)
        .eq("status", "open")
        .limit(5),
      getReportsSummary(organizationId),
      getTeamsForOrg(organizationId),
    ]);

  const teamPulse = await Promise.all(
    teams.map(async (team) => {
      const [rocks, issues, meeting] = await Promise.all([
        supabase
          .from("rocks")
          .select("status")
          .eq("organization_id", organizationId)
          .eq("team_id", team.id)
          .is("archived_at", null),
        supabase
          .from("issues")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("team_id", team.id)
          .eq("status", "open"),
        supabase
          .from("meetings")
          .select("metadata")
          .eq("organization_id", organizationId)
          .eq("team_id", team.id)
          .eq("status", "completed")
          .order("ended_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const rockRows = rocks.data ?? [];
      const done = rockRows.filter((row) => row.status === "done").length;
      const rockCompletionPct =
        rockRows.length > 0 ? Math.round((done / rockRows.length) * 100) : 0;

      let lastL10Rating: number | null = null;
      const metadata = meeting.data?.metadata;
      if (
        typeof metadata === "object" &&
        metadata !== null &&
        !Array.isArray(metadata) &&
        Array.isArray((metadata as Record<string, unknown>).ratings)
      ) {
        const ratings = (metadata as Record<string, unknown>).ratings as Array<{
          rating?: number;
        }>;
        const values = ratings
          .map((entry) => entry.rating)
          .filter((value): value is number => typeof value === "number");
        if (values.length > 0) {
          lastL10Rating =
            Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) /
            10;
        }
      }

      return {
        teamId: team.id,
        teamName: team.name,
        teamSlug: team.slug,
        rockCompletionPct,
        openIssues: issues.count ?? 0,
        lastL10Rating,
      };
    }),
  );

  void orgSlug;

  return {
    summary,
    overdueTodos: overdueTodos.data ?? [],
    offTrackRocks: offTrackRocks.data ?? [],
    assignedIssues: assignedIssues.data ?? [],
    teamPulse,
    companySnapshot,
  };
}
