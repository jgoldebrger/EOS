import { createClient } from "@/lib/supabase/server";
import { getCascadeCompletionMetric } from "@/features/cascades/queries";
import { getCurrentQuarter } from "@/features/rocks/utils";
import {
  computeRprsStatus,
  type CoreValueRating,
} from "@/features/people/utils";
import { computeScorecardRollup } from "@/features/reports/scorecard-rollup";
import type {
  ExecutiveReportsData,
  L10RatingTrendPoint,
  RockCompletionByTeam,
  RprsDistribution,
} from "@/features/reports/types";

export type {
  CascadeCompletionMetric,
  ExecutiveReportsData,
  IdsThroughput,
  L10RatingTrendPoint,
  RockCompletionByTeam,
  RprsDistribution,
  ScorecardRollupRow,
} from "@/features/reports/types";
export { buildScorecardRollupCsv } from "@/features/reports/csv";

function parseMeetingAvgRating(metadata: unknown): number | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  const ratings = (metadata as Record<string, unknown>).ratings;
  if (!Array.isArray(ratings)) {
    return null;
  }

  const values = ratings
    .map((entry) => (entry as { rating?: number }).rating)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return null;
  }

  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export async function getExecutiveReportsData(
  organizationId: string,
  quarter: string = getCurrentQuarter(),
): Promise<ExecutiveReportsData> {
  const supabase = await createClient();

  const [teamsResult, metricsResult, valuesResult, meetingsResult, rocksResult, issuesOpened, issuesSolved, reviewsResult, cascadeCompletion] =
    await Promise.all([
      supabase.from("teams").select("id, name").eq("organization_id", organizationId),
      supabase
        .from("scorecard_metrics")
        .select(
          "id, team_id, target_rule, target_operator, target_value, target_min, target_max, tolerance_percent, value_type, time_kind",
        )
        .eq("organization_id", organizationId)
        .is("archived_at", null),
      supabase
        .from("scorecard_values")
        .select("metric_id, actual, status_override, target_snapshot, period_start")
        .eq("organization_id", organizationId)
        .order("period_start", { ascending: false }),
      supabase
        .from("meetings")
        .select("team_id, ended_at, metadata, teams(name)")
        .eq("organization_id", organizationId)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(50),
      supabase
        .from("rocks")
        .select("team_id, status, quarter, teams(name)")
        .eq("organization_id", organizationId)
        .eq("quarter", quarter)
        .is("archived_at", null),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", quarterStartIso(quarter)),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "solved")
        .gte("updated_at", quarterStartIso(quarter)),
      supabase
        .from("people_reviews" as never)
        .select("get_it, want_it, capacity, core_values_scores")
        .eq("organization_id", organizationId)
        .eq("quarter", quarter),
      getCascadeCompletionMetric(organizationId),
    ]);

  const teams = teamsResult.data ?? [];
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  const scorecardRollup = computeScorecardRollup(
    metricsResult.data ?? [],
    (valuesResult.data ?? []).map((value) => ({
      metric_id: value.metric_id,
      actual:
        value.actual === null || value.actual === undefined
          ? null
          : Number(value.actual),
      status_override: value.status_override,
      target_snapshot:
        value.target_snapshot === null || value.target_snapshot === undefined
          ? null
          : Number(value.target_snapshot),
      period_start: value.period_start,
    })),
    teamNameById,
  );

  const l10RatingTrend: L10RatingTrendPoint[] = [];
  for (const meeting of meetingsResult.data ?? []) {
    const avgRating = parseMeetingAvgRating(meeting.metadata);
    if (avgRating === null || !meeting.team_id || !meeting.ended_at) continue;

    const teamJoin = meeting.teams as { name: string } | null;
    l10RatingTrend.push({
      teamId: meeting.team_id,
      teamName: teamJoin?.name ?? teamNameById.get(meeting.team_id) ?? "Team",
      meetingDate: meeting.ended_at,
      avgRating,
    });
  }

  const rockMap = new Map<string | null, RockCompletionByTeam>();
  for (const rock of rocksResult.data ?? []) {
    const teamId = rock.team_id;
    const existing = rockMap.get(teamId) ?? {
      teamId,
      teamName: teamId
        ? ((rock.teams as { name: string } | null)?.name ?? teamNameById.get(teamId) ?? "Team")
        : "Organization",
      total: 0,
      done: 0,
      completionPct: 0,
    };
    existing.total += 1;
    if (rock.status === "done") existing.done += 1;
    rockMap.set(teamId, existing);
  }

  const rockCompletionByTeam = Array.from(rockMap.values()).map((row) => ({
    ...row,
    completionPct: row.total > 0 ? Math.round((row.done / row.total) * 100) : 0,
  }));

  const opened = issuesOpened.count ?? 0;
  const solved = issuesSolved.count ?? 0;

  const rprsDistribution: RprsDistribution = { green: 0, yellow: 0, red: 0, total: 0 };
  const reviewRows = (reviewsResult.data ?? []) as Array<{
    get_it: number;
    want_it: number;
    capacity: number;
    core_values_scores: Record<string, CoreValueRating> | null;
  }>;

  for (const review of reviewRows) {
    const status = computeRprsStatus({
      getIt: review.get_it,
      wantIt: review.want_it,
      capacity: review.capacity,
      coreValueNames: Object.keys(review.core_values_scores ?? {}),
      coreValuesScores: review.core_values_scores ?? {},
    });
    rprsDistribution[status] += 1;
    rprsDistribution.total += 1;
  }

  return {
    quarter,
    scorecardRollup,
    l10RatingTrend: l10RatingTrend.slice(0, 20),
    rockCompletionByTeam,
    idsThroughput: {
      opened,
      solved,
      solveRatePct: opened > 0 ? Math.round((solved / opened) * 100) : 0,
    },
    rprsDistribution,
    cascadeCompletion,
  };
}

function quarterStartIso(quarter: string): string {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) {
    return new Date().toISOString();
  }

  const year = Number(match[1]);
  const q = Number(match[2]);
  const month = (q - 1) * 3;
  return new Date(Date.UTC(year, month, 1)).toISOString();
}
