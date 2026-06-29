import { createClient } from "@/lib/supabase/server";
import {
  evaluateMetricStatus,
  formatOwnerLabel,
  getLastNWeeks,
  type TargetRule,
} from "@/features/scorecard/utils";
import type {
  ScorecardMemberOption,
  ScorecardMetricWithOwner,
  ScorecardTeamOption,
  ScorecardValue,
  ScorecardValueCell,
} from "@/features/scorecard/types";

export async function getMetricsForOrg(
  organizationId: string,
): Promise<ScorecardMetricWithOwner[]> {
  const supabase = await createClient();

  const { data: metrics, error } = await supabase
    .from("scorecard_metrics")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !metrics) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return metrics.map((row) => {
    const { teams: teamJoin, ...metric } = row;
    const team = teamJoin as { name: string } | null;
    const ownerId = metric.owner_id;
    const ownerEmail = user?.id === ownerId ? currentEmail : null;

    return {
      ...metric,
      teamName: team?.name ?? null,
      owner: {
        userId: ownerId,
        label: formatOwnerLabel(ownerId, ownerEmail),
        email: ownerEmail,
      },
    };
  });
}

export async function getValuesForMetrics(
  metricIds: string[],
  weeks: string[] = getLastNWeeks(13),
): Promise<Record<string, ScorecardValueCell[]>> {
  if (metricIds.length === 0) {
    return {};
  }

  const supabase = await createClient();

  const { data: values, error } = await supabase
    .from("scorecard_values")
    .select("*")
    .in("metric_id", metricIds)
    .in("period_start", weeks);

  if (error || !values) {
    return Object.fromEntries(metricIds.map((id) => [id, buildEmptyWeeks(weeks)]));
  }

  const { data: metrics } = await supabase
    .from("scorecard_metrics")
    .select(
      "id, target_rule, target_value, target_min, target_max, tolerance_percent",
    )
    .in("id", metricIds);

  const metricMap = new Map(
    (metrics ?? []).map((metric) => [metric.id, metric]),
  );

  const valuesByMetric = new Map<string, ScorecardValue[]>();
  for (const value of values) {
    const existing = valuesByMetric.get(value.metric_id) ?? [];
    existing.push(value);
    valuesByMetric.set(value.metric_id, existing);
  }

  const result: Record<string, ScorecardValueCell[]> = {};

  for (const metricId of metricIds) {
    const metric = metricMap.get(metricId);
    const metricValues = valuesByMetric.get(metricId) ?? [];
    const valueByWeek = new Map(metricValues.map((v) => [v.period_start, v]));

    result[metricId] = weeks.map((periodStart) => {
      const stored = valueByWeek.get(periodStart);
      const actual =
        stored?.actual === null || stored?.actual === undefined
          ? null
          : Number(stored.actual);
      const targetSnapshot =
        stored?.target_snapshot === null || stored?.target_snapshot === undefined
          ? metric?.target_value === null || metric?.target_value === undefined
            ? null
            : Number(metric.target_value)
          : Number(stored.target_snapshot);

      const statusOverride = stored?.status_override as ScorecardValueCell["statusOverride"];
      const status =
        statusOverride ??
        evaluateMetricStatus(
          (metric?.target_rule ?? "exact") as TargetRule,
          actual,
          targetSnapshot,
          Number(metric?.tolerance_percent ?? 10),
          {
            min:
              metric?.target_min === null || metric?.target_min === undefined
                ? null
                : Number(metric.target_min),
            max:
              metric?.target_max === null || metric?.target_max === undefined
                ? null
                : Number(metric.target_max),
          },
        );

      return {
        periodStart,
        actual,
        targetSnapshot,
        statusOverride,
        status,
        valueId: stored?.id ?? null,
        notes: stored?.notes ?? null,
      };
    });
  }

  return result;
}

function buildEmptyWeeks(weeks: string[]): ScorecardValueCell[] {
  return weeks.map((periodStart) => ({
    periodStart,
    actual: null,
    targetSnapshot: null,
    statusOverride: null,
    status: "na" as const,
    valueId: null,
    notes: null,
  }));
}

export async function getOrgTeamsForScorecard(
  organizationId: string,
): Promise<ScorecardTeamOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOrgMembersForScorecard(
  organizationId: string,
): Promise<ScorecardMemberOption[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, org_role")
    .eq("organization_id", organizationId)
    .in("org_role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((member) => ({
    userId: member.user_id,
    orgRole: member.org_role,
    label:
      user?.id === member.user_id
        ? formatOwnerLabel(member.user_id, user.email)
        : formatOwnerLabel(member.user_id),
  }));
}
