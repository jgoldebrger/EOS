import {
  evaluateMetricForRow,
  type MetricStatus,
} from "@/features/scorecard/utils";
import type { TargetRule } from "@/features/scorecard/types";
import type { ScorecardRollupRow } from "@/features/reports/types";

export interface MetricForRollup {
  id: string;
  team_id: string | null;
  target_rule: string;
  target_operator?: string | null;
  target_value?: number | null;
  target_min?: number | null;
  target_max?: number | null;
  tolerance_percent?: number | null;
  value_type?: string | null;
  time_kind?: string | null;
}

export interface ValueForRollup {
  metric_id: string;
  actual: number | null;
  status_override: string | null;
  target_snapshot: number | null;
  period_start: string;
}

function resolveMetricStatus(
  metric: MetricForRollup,
  stored: ValueForRollup | undefined,
): MetricStatus {
  if (!stored) {
    return "na";
  }

  const override = stored.status_override;
  if (override === "green" || override === "yellow" || override === "red") {
    return override;
  }

  const actual =
    stored.actual === null || stored.actual === undefined
      ? null
      : Number(stored.actual);
  const targetSnapshot =
    stored.target_snapshot === null || stored.target_snapshot === undefined
      ? metric.target_value === null || metric.target_value === undefined
        ? null
        : Number(metric.target_value)
      : Number(stored.target_snapshot);

  return evaluateMetricForRow(
    {
      target_rule: (metric.target_rule ?? "exact") as TargetRule,
      target_operator: metric.target_operator,
      target_value:
        metric.target_value === null || metric.target_value === undefined
          ? null
          : Number(metric.target_value),
      target_min:
        metric.target_min === null || metric.target_min === undefined
          ? null
          : Number(metric.target_min),
      target_max:
        metric.target_max === null || metric.target_max === undefined
          ? null
          : Number(metric.target_max),
      tolerance_percent: metric.tolerance_percent,
      value_type: metric.value_type,
      time_kind: metric.time_kind,
    },
    actual,
    targetSnapshot,
  );
}

function latestValueByMetric(values: ValueForRollup[]): Map<string, ValueForRollup> {
  const sorted = [...values].sort((a, b) => b.period_start.localeCompare(a.period_start));
  const map = new Map<string, ValueForRollup>();
  for (const value of sorted) {
    if (!map.has(value.metric_id)) {
      map.set(value.metric_id, value);
    }
  }
  return map;
}

export function computeScorecardRollup(
  metrics: MetricForRollup[],
  values: ValueForRollup[],
  teamNameById: Map<string, string>,
): ScorecardRollupRow[] {
  const latestByMetric = latestValueByMetric(values);
  const rollupMap = new Map<string | null, ScorecardRollupRow>();

  function ensureRollup(teamId: string | null): ScorecardRollupRow {
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

  for (const metric of metrics) {
    const row = ensureRollup(metric.team_id);
    row.metricCount += 1;
    const status = resolveMetricStatus(metric, latestByMetric.get(metric.id));
    if (status === "green") row.greenCount += 1;
    if (status === "yellow") row.yellowCount += 1;
    if (status === "red") row.redCount += 1;
  }

  return Array.from(rollupMap.values()).map((row) => ({
    ...row,
    onTrackPct:
      row.metricCount > 0 ? Math.round((row.greenCount / row.metricCount) * 100) : 0,
  }));
}
