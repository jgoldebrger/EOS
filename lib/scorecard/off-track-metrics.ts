import {
  evaluateMetricForRow,
  type MetricStatus,
} from "@/features/scorecard/utils";
import type { TargetRule } from "@/features/scorecard/types";

export interface MetricForOffTrack {
  id: string;
  name: string;
  team_id: string | null;
  owner_id: string;
  target_rule: string;
  target_operator?: string | null;
  target_value?: number | null;
  target_min?: number | null;
  target_max?: number | null;
  tolerance_percent?: number | null;
  value_type?: string | null;
  time_kind?: string | null;
}

export interface ValueForOffTrack {
  metric_id: string;
  actual: number | null;
  status_override: string | null;
  target_snapshot: number | null;
  period_start: string;
}

export interface OffTrackMetric {
  metricId: string;
  metricName: string;
  teamId: string | null;
  ownerId: string;
  status: MetricStatus;
  actual: number | null;
  target: number | null;
  periodStart: string;
}

function resolveMetricStatus(
  metric: MetricForOffTrack,
  stored: ValueForOffTrack | undefined,
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

function latestValueByMetric(values: ValueForOffTrack[]): Map<string, ValueForOffTrack> {
  const sorted = [...values].sort((a, b) => b.period_start.localeCompare(a.period_start));
  const map = new Map<string, ValueForOffTrack>();

  for (const value of sorted) {
    if (!map.has(value.metric_id)) {
      map.set(value.metric_id, value);
    }
  }

  return map;
}

export function findOffTrackMetrics(
  metrics: MetricForOffTrack[],
  values: ValueForOffTrack[],
): OffTrackMetric[] {
  const latestByMetric = latestValueByMetric(values);
  const offTrack: OffTrackMetric[] = [];

  for (const metric of metrics) {
    const stored = latestByMetric.get(metric.id);
    const status = resolveMetricStatus(metric, stored);

    if (status !== "red" && status !== "yellow") {
      continue;
    }

    const actual =
      stored?.actual === null || stored?.actual === undefined
        ? null
        : Number(stored.actual);
    const target =
      stored?.target_snapshot === null || stored?.target_snapshot === undefined
        ? metric.target_value === null || metric.target_value === undefined
          ? null
          : Number(metric.target_value)
        : Number(stored.target_snapshot);

    offTrack.push({
      metricId: metric.id,
      metricName: metric.name,
      teamId: metric.team_id,
      ownerId: metric.owner_id,
      status,
      actual,
      target,
      periodStart: stored?.period_start ?? "",
    });
  }

  return offTrack.sort((a, b) => a.metricName.localeCompare(b.metricName));
}

export function groupOffTrackByOwner(
  metrics: OffTrackMetric[],
): Map<string, OffTrackMetric[]> {
  const grouped = new Map<string, OffTrackMetric[]>();

  for (const metric of metrics) {
    const existing = grouped.get(metric.ownerId) ?? [];
    existing.push(metric);
    grouped.set(metric.ownerId, existing);
  }

  return grouped;
}

export function getIsoWeekKey(date: Date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function getWeekStartIso(date: Date = new Date()): string {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}
