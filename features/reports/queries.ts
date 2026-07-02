import { createClient } from "@/lib/supabase/server";
import { getCascadeCompletionMetric } from "@/features/cascades/queries";
import { getCurrentQuarter } from "@/features/rocks/utils";
import {
  computeRprsStatus,
  type CoreValueRating,
} from "@/features/people/utils";

export interface ScorecardRollupRow {
  teamId: string | null;
  teamName: string;
  metricCount: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  onTrackPct: number;
}

export interface L10RatingTrendPoint {
  teamId: string;
  teamName: string;
  meetingDate: string;
  avgRating: number;
}

export interface RockCompletionByTeam {
  teamId: string | null;
  teamName: string;
  total: number;
  done: number;
  completionPct: number;
}

export interface IdsThroughput {
  opened: number;
  solved: number;
  solveRatePct: number;
}

export interface RprsDistribution {
  green: number;
  yellow: number;
  red: number;
  total: number;
}

export interface ExecutiveReportsData {
  quarter: string;
  scorecardRollup: ScorecardRollupRow[];
  l10RatingTrend: L10RatingTrendPoint[];
  rockCompletionByTeam: RockCompletionByTeam[];
  idsThroughput: IdsThroughput;
  rprsDistribution: RprsDistribution;
  cascadeCompletion: Awaited<ReturnType<typeof getCascadeCompletionMetric>>;
}

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
        .select("id, team_id")
        .eq("organization_id", organizationId)
        .is("archived_at", null),
      supabase
        .from("scorecard_values")
        .select("metric_id, status_override")
        .eq("organization_id", organizationId),
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

  const latestStatusByMetric = new Map<string, string>();
  for (const value of valuesResult.data ?? []) {
    if (!latestStatusByMetric.has(value.metric_id) && value.status_override) {
      latestStatusByMetric.set(value.metric_id, value.status_override);
    }
  }

  const rollupMap = new Map<string | null, ScorecardRollupRow>();

  function ensureRollup(teamId: string | null) {
    const existing = rollupMap.get(teamId);
    if (existing) return existing;

    const row: ScorecardRollupRow = {
      teamId,
      teamName: teamId ? (teamNameById.get(teamId) ?? "Team") : "Organization",
      metricCount: 0,
      greenCount: 0,
      yellowCount: 0,
      redCount: 0,
      onTrackPct: 0,
    };
    rollupMap.set(teamId, row);
    return row;
  }

  for (const metric of metricsResult.data ?? []) {
    const row = ensureRollup(metric.team_id);
    row.metricCount += 1;
    const status = latestStatusByMetric.get(metric.id);
    if (status === "green") row.greenCount += 1;
    if (status === "yellow") row.yellowCount += 1;
    if (status === "red") row.redCount += 1;
  }

  const scorecardRollup = Array.from(rollupMap.values()).map((row) => ({
    ...row,
    onTrackPct:
      row.metricCount > 0 ? Math.round((row.greenCount / row.metricCount) * 100) : 0,
  }));

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

export function buildScorecardRollupCsv(rows: ScorecardRollupRow[]): string {
  const header = ["Team", "Metrics", "Green", "Yellow", "Red", "On-track %"];
  const lines = rows.map((row) => [
    row.teamName,
    String(row.metricCount),
    String(row.greenCount),
    String(row.yellowCount),
    String(row.redCount),
    String(row.onTrackPct),
  ]);
  return [header, ...lines].map((line) => line.join(",")).join("\n");
}
