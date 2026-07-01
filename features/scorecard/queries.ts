import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import {
  evaluateMetricForRow,
  getDatesInWeek,
  getLastNWeeks,
  getPeriodColumns,
  rollupDailyValues,
  type PeriodType,
  type RollupMethod,
  type TargetRule,
} from "@/features/scorecard/utils";
import type {
  ScorecardCategory,
  ScorecardFilters,
  ScorecardMemberOption,
  ScorecardMetricWithOwner,
  ScorecardTag,
  ScorecardTeamOption,
  ScorecardValue,
  ScorecardValueCell,
} from "@/features/scorecard/types";
import type { ScorecardPeriodTypeDb } from "@/types/database";
import {
  evaluateFormula,
  buildFormulaDependentsMap,
  findDependentMetricIdsFromGraph,
  metricRefKey,
  parseFormula,
  parseFormulaTokens,
  topologicalSortFormulaMetrics,
  type FormulaAst,
  type FormulaMetricToken,
  type MetricRef,
} from "@/features/scorecard/formula";

const METRIC_LIST_COLUMNS =
  "id, organization_id, team_id, owner_id, name, unit, description, category_id, value_type, time_kind, target_operator, entry_cadence, weekly_rollup_method, target_rule, target_value, target_min, target_max, tolerance_percent, display_target, display_order, archived_at, period_type, datasource, formula, formula_tokens, created_at, updated_at, created_by, teams(name)";

export async function getMetricsForOrg(
  organizationId: string,
  filters: ScorecardFilters = {},
): Promise<ScorecardMetricWithOwner[]> {
  return getMetricsForOrgCached(
    organizationId,
    filters.teamId ?? "",
    filters.search ?? "",
    filters.state ?? "active",
    filters.categoryId ?? "",
    filters.periodType ?? "",
    filters.ownerId ?? "",
  );
}

const getMetricsForOrgCached = cache(
  async (
    organizationId: string,
    teamId: string,
    search: string,
    state: string,
    categoryId: string,
    periodType: string,
    ownerId: string,
  ): Promise<ScorecardMetricWithOwner[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("scorecard_metrics")
      .select(METRIC_LIST_COLUMNS)
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    if (state === "active" || !state) {
      query = query.is("archived_at", null);
    } else if (state === "archived") {
      query = query.not("archived_at", "is", null);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (periodType) {
      query = query.eq("period_type", periodType as ScorecardPeriodTypeDb);
    }

    if (ownerId) {
      query = query.eq("owner_id", ownerId);
    }

    const [{ data: metrics, error }, categories] = await Promise.all([
      query,
      getCategoriesForOrg(organizationId, teamId || undefined),
    ]);

    if (error || !metrics) {
      return [];
    }

    const metricTags = await getTagsForMetrics(metrics.map((row) => row.id));

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
    const ownerProfiles = await resolveOwnerProfiles(
      metrics.map((row) => row.owner_id),
    );

    return metrics.map((row) => {
      const { teams: teamJoin, ...metric } = row;
      const team = teamJoin as { name: string } | null;
      const metricCategoryId = (metric as { category_id?: string | null }).category_id;
      const metricOwnerId = metric.owner_id;
      const ownerProfile = ownerProfiles.get(metricOwnerId);

      return {
        ...metric,
        teamName: team?.name ?? null,
        categoryName: metricCategoryId ? (categoryMap.get(metricCategoryId) ?? null) : null,
        tags: metricTags[metric.id] ?? [],
        owner: {
          userId: metricOwnerId,
          label: ownerLabelFromProfiles(ownerProfiles, metricOwnerId),
          email: ownerProfile?.email ?? null,
        },
      };
    });
  },
);

export async function getCategoriesForOrg(
  organizationId: string,
  teamId?: string,
): Promise<ScorecardCategory[]> {
  return getCategoriesForOrgCached(organizationId, teamId);
}

const getCategoriesForOrgCached = cache(
  async (organizationId: string, teamId?: string): Promise<ScorecardCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await (
      supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: ScorecardCategory[] | null;
                error: Error | null;
              }>;
            };
          };
        };
      }
    )
      .from("scorecard_categories")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .order("display_order", { ascending: true });

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as ScorecardCategory[];
    if (!teamId) {
      return rows;
    }
    return rows;
  },
);

export async function getTagsForOrg(organizationId: string): Promise<ScorecardTag[]> {
  return getTagsForOrgCached(organizationId);
}

const getTagsForOrgCached = cache(
  async (organizationId: string): Promise<ScorecardTag[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data as ScorecardTag[];
  },
);

export async function getTagsForMetrics(
  metricIds: string[],
): Promise<Record<string, ScorecardTag[]>> {
  if (metricIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scorecard_metric_tags")
    .select("metric_id, tags(id, name, color)")
    .in("metric_id", metricIds);

  if (error || !data) {
    return {};
  }

  const result: Record<string, ScorecardTag[]> = {};

  for (const row of data) {
    const tagJoin = row.tags as { id: string; name: string; color: string | null } | null;
    if (!tagJoin) {
      continue;
    }
    const metricId = row.metric_id as string;
    const existing = result[metricId] ?? [];
    existing.push({
      id: tagJoin.id,
      name: tagJoin.name,
      color: tagJoin.color,
    });
    result[metricId] = existing;
  }

  for (const metricId of metricIds) {
    if (!result[metricId]) {
      result[metricId] = [];
    } else {
      result[metricId]!.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return result;
}

export async function getValuesForMetrics(
  metricIds: string[],
  periods: string[] = getLastNWeeks(13),
  periodType: PeriodType = "weekly",
  prefetchedMetrics?: Array<ScorecardMetricWithOwner | MetricMeta>,
): Promise<Record<string, ScorecardValueCell[]>> {
  if (metricIds.length === 0) {
    return {};
  }

  let metricMap: Map<string, MetricMeta>;

  if (prefetchedMetrics && prefetchedMetrics.length > 0) {
    metricMap = new Map(
      prefetchedMetrics.map((metric) => [
        metric.id,
        {
          id: metric.id,
          organization_id: metric.organization_id,
          datasource: metric.datasource,
          formula: metric.formula,
          formula_tokens: metric.formula_tokens,
          target_rule: metric.target_rule,
          target_operator: metric.target_operator,
          target_value: metric.target_value,
          target_min: metric.target_min,
          target_max: metric.target_max,
          tolerance_percent: metric.tolerance_percent,
          entry_cadence: metric.entry_cadence,
          weekly_rollup_method: metric.weekly_rollup_method,
          value_type: metric.value_type,
          time_kind: "time_kind" in metric ? metric.time_kind : null,
        },
      ]),
    );
  } else {
    const supabase = await createClient();
    const { data: metrics } = await supabase
      .from("scorecard_metrics")
      .select(
        "id, organization_id, datasource, formula, formula_tokens, target_rule, target_operator, target_value, target_min, target_max, tolerance_percent, entry_cadence, weekly_rollup_method, value_type, time_kind",
      )
      .in("id", metricIds);
    metricMap = new Map((metrics ?? []).map((metric) => [metric.id, metric]));
  }

  const dailyMetricIds = metricIds.filter(
    (id) => metricMap.get(id)?.entry_cadence === "daily",
  );
  const weeklyMetricIds = metricIds.filter(
    (id) => metricMap.get(id)?.entry_cadence !== "daily",
  );

  const result = await fetchAllMetricValues(
    weeklyMetricIds,
    dailyMetricIds,
    periods,
    periodType,
    metricMap,
  );

  if (dailyMetricIds.length > 0 && periodType !== "weekly") {
    for (const metricId of dailyMetricIds) {
      result[metricId] = buildEmptyWeeks(periods);
    }
  }

  for (const metricId of metricIds) {
    if (!result[metricId]) {
      result[metricId] = buildEmptyWeeks(periods);
    }
  }

  await applyFormulaEvaluation(
    metricIds,
    periods,
    periodType,
    metricMap,
    result,
    prefetchedMetrics,
  );

  return result;
}

type MetricMeta = {
  id: string;
  organization_id?: string;
  datasource?: string | null;
  formula?: string | null;
  formula_tokens?: unknown;
  target_rule: string;
  target_operator?: string | null;
  target_value?: number | null;
  target_min?: number | null;
  target_max?: number | null;
  tolerance_percent?: number | null;
  entry_cadence?: string | null;
  weekly_rollup_method?: string | null;
  value_type?: string | null;
  time_kind?: string | null;
};

async function fetchAllMetricValues(
  weeklyMetricIds: string[],
  dailyMetricIds: string[],
  periods: string[],
  periodType: PeriodType,
  metricMap: Map<string, MetricMeta>,
): Promise<Record<string, ScorecardValueCell[]>> {
  const allIds = [...weeklyMetricIds, ...dailyMetricIds];
  if (allIds.length === 0 || periods.length === 0) {
    return {};
  }

  const rangeStart = periods[0]!;
  const lastWeekDates = getDatesInWeek(periods[periods.length - 1]!);
  const rangeEnd = lastWeekDates[lastWeekDates.length - 1]!;
  const periodSet = new Set(periods);

  const supabase = await createClient();
  const { data: values, error } = await supabase
    .from("scorecard_values")
    .select(
      "id, metric_id, period_start, period_type, actual, target_snapshot, status_override, notes",
    )
    .in("metric_id", allIds)
    .gte("period_start", rangeStart)
    .lte("period_start", rangeEnd);

  const valuesByMetric = new Map<string, ScorecardValue[]>();
  if (!error && values) {
    for (const value of values) {
      const existing = valuesByMetric.get(value.metric_id) ?? [];
      existing.push(value as ScorecardValue);
      valuesByMetric.set(value.metric_id, existing);
    }
  }

  const result: Record<string, ScorecardValueCell[]> = {};

  for (const metricId of weeklyMetricIds) {
    const metric = metricMap.get(metricId);
    const metricValues = (valuesByMetric.get(metricId) ?? []).filter(
      (value) => value.period_type === periodType && periodSet.has(value.period_start),
    );
    const valueByPeriod = new Map(metricValues.map((value) => [value.period_start, value]));

    result[metricId] = periods.map((periodStart) =>
      buildValueCell(periodStart, valueByPeriod.get(periodStart), metric),
    );
  }

  if (dailyMetricIds.length > 0 && periodType === "weekly") {
    Object.assign(
      result,
      buildRolledUpDailyCells(dailyMetricIds, periods, metricMap, valuesByMetric),
    );
  }

  return result;
}

function buildRolledUpDailyCells(
  metricIds: string[],
  weeks: string[],
  metricMap: Map<string, MetricMeta>,
  valuesByMetric: Map<string, ScorecardValue[]>,
): Record<string, ScorecardValueCell[]> {
  const result: Record<string, ScorecardValueCell[]> = {};

  for (const metricId of metricIds) {
    const metric = metricMap.get(metricId);
    const rollupMethod = (metric?.weekly_rollup_method ?? "sum") as RollupMethod;
    const metricValues = (valuesByMetric.get(metricId) ?? []).filter(
      (value) => value.period_type === "daily",
    );
    const valueByDate = new Map(metricValues.map((value) => [value.period_start, value]));

    result[metricId] = weeks.map((weekStart) => {
      const weekDates = getDatesInWeek(weekStart);
      const dailyValues = weekDates.map((date) => {
        const stored = valueByDate.get(date);
        return {
          date,
          actual:
            stored?.actual === null || stored?.actual === undefined
              ? null
              : Number(stored.actual),
          valueId: stored?.id ?? null,
        };
      });

      const numericValues = dailyValues
        .map((entry) => entry.actual)
        .filter((value): value is number => value !== null);

      const rolledActual = rollupDailyValues(numericValues, rollupMethod);

      const weekTargetSnapshot = resolveWeekTargetSnapshot(
        weekDates,
        valueByDate,
        metric?.target_value,
      );

      const status = evaluateMetricForRow(
        {
          target_rule: (metric?.target_rule ?? "exact") as TargetRule,
          target_operator: metric?.target_operator,
          target_value:
            metric?.target_value === null || metric?.target_value === undefined
              ? null
              : Number(metric.target_value),
          target_min:
            metric?.target_min === null || metric?.target_min === undefined
              ? null
              : Number(metric.target_min),
          target_max:
            metric?.target_max === null || metric?.target_max === undefined
              ? null
              : Number(metric.target_max),
          tolerance_percent: metric?.tolerance_percent,
          value_type: metric?.value_type,
          time_kind: metric?.time_kind,
        },
        rolledActual,
        weekTargetSnapshot,
      );

      return {
        periodStart: weekStart,
        actual: rolledActual,
        targetSnapshot: weekTargetSnapshot,
        statusOverride: null,
        status,
        valueId: null,
        notes: null,
        isRolledUp: true,
        dailyValues,
        rollupMethod,
        filledDayCount: numericValues.length,
      };
    });
  }

  return result;
}

function buildValueCell(
  periodStart: string,
  stored: ScorecardValue | undefined,
  metric: MetricMeta | undefined,
): ScorecardValueCell {
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
    evaluateMetricForRow(
      {
        target_rule: (metric?.target_rule ?? "exact") as TargetRule,
        target_operator: metric?.target_operator,
        target_value:
          metric?.target_value === null || metric?.target_value === undefined
            ? null
            : Number(metric.target_value),
        target_min:
          metric?.target_min === null || metric?.target_min === undefined
            ? null
            : Number(metric.target_min),
        target_max:
          metric?.target_max === null || metric?.target_max === undefined
            ? null
            : Number(metric.target_max),
        tolerance_percent: metric?.tolerance_percent,
        value_type: metric?.value_type,
        time_kind: metric?.time_kind,
      },
      actual,
      targetSnapshot,
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

function resolveWeekTargetSnapshot(
  weekDates: string[],
  valueByDate: Map<string, Pick<ScorecardValue, "target_snapshot">>,
  metricTarget: number | null | undefined,
): number | null {
  for (const date of weekDates) {
    const stored = valueByDate.get(date);
    if (stored?.target_snapshot !== null && stored?.target_snapshot !== undefined) {
      return Number(stored.target_snapshot);
    }
  }

  return metricTarget === null || metricTarget === undefined ? null : Number(metricTarget);
}

interface FormulaMetricDef {
  key: string;
  metricId: string;
  organizationId: string;
  formula: string;
  tokens: FormulaMetricToken[];
  metric: MetricMeta;
}

async function expandFormulaMetricClosure(
  initial: FormulaMetricDef[],
  metricMap: Map<string, MetricMeta>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<FormulaMetricDef[]> {
  const byKey = new Map(initial.map((metric) => [metric.key, metric]));
  const queue = [...initial];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const parsed = parseFormula(current.formula);
    if ("error" in parsed) {
      continue;
    }

    for (const dep of parsed.refs) {
      const depKey = metricRefKey(dep.organizationId, dep.metricId);
      if (byKey.has(depKey)) {
        continue;
      }

      let depMetric = metricMap.get(dep.metricId);
      if (!depMetric) {
        const { data } = await supabase
          .from("scorecard_metrics")
          .select(
            "id, organization_id, datasource, formula, formula_tokens, target_rule, target_operator, target_value, target_min, target_max, tolerance_percent, entry_cadence, weekly_rollup_method, value_type, time_kind",
          )
          .eq("id", dep.metricId)
          .eq("organization_id", dep.organizationId)
          .maybeSingle();
        if (!data || data.datasource !== "formula" || !data.formula) {
          continue;
        }
        depMetric = data as MetricMeta;
        metricMap.set(dep.metricId, depMetric);
      }

      if (depMetric.datasource !== "formula" || !depMetric.formula || !depMetric.organization_id) {
        continue;
      }

      const def: FormulaMetricDef = {
        key: depKey,
        metricId: dep.metricId,
        organizationId: depMetric.organization_id,
        formula: depMetric.formula,
        tokens: parseFormulaTokens(depMetric.formula_tokens),
        metric: depMetric,
      };
      byKey.set(depKey, def);
      queue.push(def);
    }
  }

  return [...byKey.values()];
}

async function applyFormulaEvaluation(
  metricIds: string[],
  periods: string[],
  periodType: PeriodType,
  metricMap: Map<string, MetricMeta>,
  result: Record<string, ScorecardValueCell[]>,
  prefetchedMetrics?: Array<ScorecardMetricWithOwner | MetricMeta>,
): Promise<void> {
  if (periodType !== "weekly" || periods.length === 0) {
    return;
  }

  const formulaMetrics: FormulaMetricDef[] = [];

  for (const metricId of metricIds) {
    const metric = metricMap.get(metricId);
    if (metric?.datasource !== "formula" || !metric.formula) {
      continue;
    }

    const parsed = parseFormula(metric.formula);
    if ("error" in parsed) {
      continue;
    }

    const organizationId =
      metric.organization_id ??
      prefetchedMetrics?.find((row) => row.id === metricId)?.organization_id;
    if (!organizationId) {
      continue;
    }

    formulaMetrics.push({
      key: metricRefKey(organizationId, metricId),
      metricId,
      organizationId,
      formula: metric.formula,
      tokens: parseFormulaTokens(metric.formula_tokens),
      metric,
    });
  }

  if (formulaMetrics.length === 0) {
    return;
  }

  const supabase = await createClient();
  const expandedFormulaMetrics = await expandFormulaMetricClosure(
    formulaMetrics,
    metricMap,
    supabase,
  );

  const dependencyRefs = new Map<string, MetricRef>();
  for (const formulaMetric of expandedFormulaMetrics) {
    const parsed = parseFormula(formulaMetric.formula);
    if ("error" in parsed) {
      continue;
    }
    for (const dep of parsed.refs) {
      dependencyRefs.set(metricRefKey(dep.organizationId, dep.metricId), dep);
    }
  }

  const missingDepIds = [...dependencyRefs.values()]
    .map((dep) => dep.metricId)
    .filter((depId) => !metricMap.has(depId));

  if (missingDepIds.length > 0) {
    const { data: depMetrics } = await supabase
      .from("scorecard_metrics")
      .select(
        "id, organization_id, datasource, formula, formula_tokens, target_rule, target_operator, target_value, target_min, target_max, tolerance_percent, entry_cadence, weekly_rollup_method, value_type, time_kind",
      )
      .in("id", missingDepIds);

    if (depMetrics?.length) {
      const manualDepIds = depMetrics
        .filter((row) => row.datasource !== "formula")
        .map((row) => row.id);
      const dailyDepIds = depMetrics
        .filter((row) => row.datasource !== "formula" && row.entry_cadence === "daily")
        .map((row) => row.id);
      const weeklyDepIds = manualDepIds.filter((id) => !dailyDepIds.includes(id));

      const depValues = await fetchAllMetricValues(
        weeklyDepIds,
        dailyDepIds,
        periods,
        periodType,
        new Map(depMetrics.map((row) => [row.id, row as MetricMeta])),
      );

      for (const row of depMetrics) {
        metricMap.set(row.id, row as MetricMeta);
        if (depValues[row.id]) {
          result[row.id] = depValues[row.id]!;
        }
      }
    }
  }

  const dependenciesByKey = new Map<string, MetricRef[]>();
  const parsedByKey = new Map<string, { ast: FormulaAst; refs: MetricRef[] }>();

  for (const formulaMetric of expandedFormulaMetrics) {
    const parsed = parseFormula(formulaMetric.formula);
    if ("error" in parsed) {
      continue;
    }
    parsedByKey.set(formulaMetric.key, parsed);
    dependenciesByKey.set(formulaMetric.key, parsed.refs);
  }

  const weeklyCadenceFormulas = expandedFormulaMetrics.filter(
    (metric) => metric.metric.entry_cadence !== "daily",
  );
  const dailyCadenceFormulas = expandedFormulaMetrics.filter(
    (metric) => metric.metric.entry_cadence === "daily",
  );

  if (weeklyCadenceFormulas.length > 0) {
    const sortedWeeklyKeys = topologicalSortFormulaMetrics(
      weeklyCadenceFormulas.map((metric) => metric.key),
      dependenciesByKey,
    );
    const sortedWeeklyMetrics = sortedWeeklyKeys
      .map((key) => weeklyCadenceFormulas.find((metric) => metric.key === key))
      .filter((metric): metric is FormulaMetricDef => Boolean(metric));

    applyWeeklyFormulaEvaluation(
      sortedWeeklyMetrics,
      parsedByKey,
      periods,
      metricMap,
      result,
    );
  }

  if (dailyCadenceFormulas.length > 0) {
    const sortedDailyKeys = topologicalSortFormulaMetrics(
      dailyCadenceFormulas.map((metric) => metric.key),
      dependenciesByKey,
    );
    const sortedDailyMetrics = sortedDailyKeys
      .map((key) => dailyCadenceFormulas.find((metric) => metric.key === key))
      .filter((metric): metric is FormulaMetricDef => Boolean(metric));

    applyDailyFormulaEvaluationForWeeklyGrid(
      sortedDailyMetrics,
      parsedByKey,
      periods,
      metricMap,
      result,
    );
  }
}

function applyWeeklyFormulaEvaluation(
  sortedMetrics: FormulaMetricDef[],
  parsedByKey: Map<string, { ast: FormulaAst; refs: MetricRef[] }>,
  periods: string[],
  metricMap: Map<string, MetricMeta>,
  result: Record<string, ScorecardValueCell[]>,
): void {
  for (const periodStart of periods) {
    const periodValues = new Map<string, number | null>();

    for (const [metricId, cells] of Object.entries(result)) {
      const cell = cells.find((entry) => entry.periodStart === periodStart);
      const metric = metricMap.get(metricId);
      if (!metric?.organization_id) {
        continue;
      }
      periodValues.set(
        metricRefKey(metric.organization_id, metricId),
        cell?.actual ?? null,
      );
    }

    for (const formulaMetric of sortedMetrics) {
      const parsed = parsedByKey.get(formulaMetric.key);
      if (!parsed) {
        continue;
      }

      const actual = evaluateFormula(parsed.ast, parsed.refs, periodValues);
      periodValues.set(formulaMetric.key, actual);

      const cells = result[formulaMetric.metricId] ?? buildEmptyWeeks(periods);
      const cellIndex = cells.findIndex((cell) => cell.periodStart === periodStart);
      if (cellIndex === -1) {
        continue;
      }

      const targetSnapshot =
        formulaMetric.metric.target_value === null ||
        formulaMetric.metric.target_value === undefined
          ? null
          : Number(formulaMetric.metric.target_value);

      const status = evaluateMetricForRow(
        {
          target_rule: (formulaMetric.metric.target_rule ?? "exact") as TargetRule,
          target_operator: formulaMetric.metric.target_operator,
          target_value: targetSnapshot,
          target_min:
            formulaMetric.metric.target_min === null ||
            formulaMetric.metric.target_min === undefined
              ? null
              : Number(formulaMetric.metric.target_min),
          target_max:
            formulaMetric.metric.target_max === null ||
            formulaMetric.metric.target_max === undefined
              ? null
              : Number(formulaMetric.metric.target_max),
          tolerance_percent: formulaMetric.metric.tolerance_percent,
          value_type: formulaMetric.metric.value_type,
          time_kind: formulaMetric.metric.time_kind,
        },
        actual,
        targetSnapshot,
      );

      cells[cellIndex] = {
        ...cells[cellIndex]!,
        actual,
        targetSnapshot,
        status,
        valueId: null,
        notes: null,
        isFormula: true,
        formulaHint: "Calculated from formula",
      };
      result[formulaMetric.metricId] = cells;
    }
  }
}

function getMetricActualForDate(
  metricId: string,
  organizationId: string,
  date: string,
  weekStart: string,
  result: Record<string, ScorecardValueCell[]>,
  metricMap: Map<string, MetricMeta>,
): number | null {
  const metric = metricMap.get(metricId);
  const cells = result[metricId];
  if (!metric || !cells) {
    return null;
  }

  if (metric.entry_cadence === "daily" && metric.datasource !== "formula") {
    const weekCell = cells.find((cell) => cell.periodStart === weekStart);
    return weekCell?.dailyValues?.find((entry) => entry.date === date)?.actual ?? null;
  }

  const weekCell = cells.find((cell) => cell.periodStart === weekStart);
  return weekCell?.actual ?? null;
}

function buildPeriodValuesForDate(
  date: string,
  weekStart: string,
  result: Record<string, ScorecardValueCell[]>,
  metricMap: Map<string, MetricMeta>,
  dailyFormulaKeys: Set<string>,
  computedValues: Map<string, number | null>,
): Map<string, number | null> {
  const periodValues = new Map<string, number | null>(computedValues);

  for (const [metricId, cells] of Object.entries(result)) {
    const metric = metricMap.get(metricId);
    if (!metric?.organization_id) {
      continue;
    }

    const key = metricRefKey(metric.organization_id, metricId);
    if (dailyFormulaKeys.has(key)) {
      continue;
    }

    periodValues.set(
      key,
      getMetricActualForDate(metricId, metric.organization_id, date, weekStart, result, metricMap),
    );
  }

  return periodValues;
}

function applyDailyFormulaEvaluationForWeeklyGrid(
  sortedMetrics: FormulaMetricDef[],
  parsedByKey: Map<string, { ast: FormulaAst; refs: MetricRef[] }>,
  periods: string[],
  metricMap: Map<string, MetricMeta>,
  result: Record<string, ScorecardValueCell[]>,
): void {
  const dailyFormulaKeys = new Set(sortedMetrics.map((metric) => metric.key));
  const dailyResults = new Map<string, Map<string, number | null>>();

  for (const formulaMetric of sortedMetrics) {
    dailyResults.set(formulaMetric.metricId, new Map());
  }

  for (const weekStart of periods) {
    const weekDates = getDatesInWeek(weekStart);
    const computedForDate = new Map<string, number | null>();

    for (const date of weekDates) {
      const periodValues = buildPeriodValuesForDate(
        date,
        weekStart,
        result,
        metricMap,
        dailyFormulaKeys,
        computedForDate,
      );

      for (const formulaMetric of sortedMetrics) {
        const parsed = parsedByKey.get(formulaMetric.key);
        if (!parsed) {
          continue;
        }

        const actual = evaluateFormula(parsed.ast, parsed.refs, periodValues);
        periodValues.set(formulaMetric.key, actual);
        computedForDate.set(formulaMetric.key, actual);
        dailyResults.get(formulaMetric.metricId)!.set(date, actual);
      }
    }

    for (const formulaMetric of sortedMetrics) {
      const rollupMethod = (formulaMetric.metric.weekly_rollup_method ?? "sum") as RollupMethod;
      const metricDaily = dailyResults.get(formulaMetric.metricId)!;
      const dailyValues = weekDates.map((date) => ({
        date,
        actual: metricDaily.get(date) ?? null,
        valueId: null,
      }));

      const numericValues = dailyValues
        .map((entry) => entry.actual)
        .filter((value): value is number => value !== null);

      const rolledActual = rollupDailyValues(numericValues, rollupMethod);
      const targetSnapshot =
        formulaMetric.metric.target_value === null ||
        formulaMetric.metric.target_value === undefined
          ? null
          : Number(formulaMetric.metric.target_value);

      const status = evaluateMetricForRow(
        {
          target_rule: (formulaMetric.metric.target_rule ?? "exact") as TargetRule,
          target_operator: formulaMetric.metric.target_operator,
          target_value: targetSnapshot,
          target_min:
            formulaMetric.metric.target_min === null ||
            formulaMetric.metric.target_min === undefined
              ? null
              : Number(formulaMetric.metric.target_min),
          target_max:
            formulaMetric.metric.target_max === null ||
            formulaMetric.metric.target_max === undefined
              ? null
              : Number(formulaMetric.metric.target_max),
          tolerance_percent: formulaMetric.metric.tolerance_percent,
          value_type: formulaMetric.metric.value_type,
          time_kind: formulaMetric.metric.time_kind,
        },
        rolledActual,
        targetSnapshot,
      );

      const cells = result[formulaMetric.metricId] ?? buildEmptyWeeks(periods);
      const cellIndex = cells.findIndex((cell) => cell.periodStart === weekStart);
      if (cellIndex === -1) {
        continue;
      }

      cells[cellIndex] = {
        periodStart: weekStart,
        actual: rolledActual,
        targetSnapshot,
        statusOverride: null,
        status,
        valueId: null,
        notes: null,
        isRolledUp: true,
        isFormula: true,
        formulaHint: "Calculated from formula (daily)",
        dailyValues,
        rollupMethod,
        filledDayCount: numericValues.length,
      };
      result[formulaMetric.metricId] = cells;
    }
  }
}

export async function syncFormulaMetricValuesToDb(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  metricIds: string[],
  periods: string[],
  createdBy: string,
): Promise<void> {
  if (metricIds.length === 0 || periods.length === 0) {
    return;
  }

  const { data: metrics } = await supabase
    .from("scorecard_metrics")
    .select(
      "id, organization_id, datasource, formula, formula_tokens, target_value, entry_cadence",
    )
    .eq("organization_id", organizationId)
    .in("id", metricIds)
    .eq("datasource", "formula")
    .is("archived_at", null);

  const formulaMetricIds = (metrics ?? []).map((row) => row.id);
  if (formulaMetricIds.length === 0) {
    return;
  }

  const valuesByMetric = await getValuesForMetrics(
    formulaMetricIds,
    periods,
    "weekly",
    metrics as MetricMeta[],
  );

  const upserts: Array<{
    organization_id: string;
    metric_id: string;
    period_start: string;
    period_type: "weekly" | "daily";
    actual: number | null;
    target_snapshot: number | null;
    created_by: string;
  }> = [];

  for (const metric of metrics ?? []) {
    const cells = valuesByMetric[metric.id] ?? [];
    const targetSnapshot =
      metric.target_value === null || metric.target_value === undefined
        ? null
        : Number(metric.target_value);
    const isDailyCadence = metric.entry_cadence === "daily";

    if (isDailyCadence) {
      for (const cell of cells) {
        if (!periods.includes(cell.periodStart)) {
          continue;
        }
        for (const day of cell.dailyValues ?? []) {
          upserts.push({
            organization_id: organizationId,
            metric_id: metric.id,
            period_start: day.date,
            period_type: "daily",
            actual: day.actual,
            target_snapshot: cell.targetSnapshot ?? targetSnapshot,
            created_by: createdBy,
          });
        }
      }
      continue;
    }

    for (const cell of cells) {
      if (!periods.includes(cell.periodStart)) {
        continue;
      }
      upserts.push({
        organization_id: organizationId,
        metric_id: metric.id,
        period_start: cell.periodStart,
        period_type: "weekly",
        actual: cell.actual,
        target_snapshot: cell.targetSnapshot ?? targetSnapshot,
        created_by: createdBy,
      });
    }
  }

  if (upserts.length === 0) {
    return;
  }

  await supabase
    .from("scorecard_values")
    .upsert(upserts, { onConflict: "metric_id,period_start,period_type" });
}

export type FormulaDependencyGraph = {
  dependentsBySourceMetricId: Map<string, string[]>;
  formulaMetrics: Array<{ id: string; tokens: FormulaMetricToken[] }>;
};

export const getFormulaDependencyGraph = cache(
  async (organizationId: string): Promise<FormulaDependencyGraph> => {
    const supabase = await createClient();
    const { data: formulaMetrics } = await supabase
      .from("scorecard_metrics")
      .select("id, formula_tokens")
      .eq("organization_id", organizationId)
      .eq("datasource", "formula")
      .is("archived_at", null);

    const metrics = (formulaMetrics ?? []).map((row) => ({
      id: row.id,
      tokens: parseFormulaTokens(row.formula_tokens),
    }));

    return {
      dependentsBySourceMetricId: buildFormulaDependentsMap(metrics),
      formulaMetrics: metrics,
    };
  },
);

/** Formula metrics whose tokens reference any of `sourceMetricIds`. */
export async function findFormulaDependentMetricIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  sourceMetricIds: string[],
): Promise<string[]> {
  if (sourceMetricIds.length === 0) {
    return [];
  }

  const graph = await getFormulaDependencyGraph(organizationId);
  return findDependentMetricIdsFromGraph(
    graph.dependentsBySourceMetricId,
    sourceMetricIds,
  );
}

export async function getOrgTeamsForScorecard(
  organizationId: string,
): Promise<ScorecardTeamOption[]> {
  return getOrgTeamsForScorecardCached(organizationId);
}

const getOrgTeamsForScorecardCached = cache(
  async (organizationId: string): Promise<ScorecardTeamOption[]> => {
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
  },
);

export async function getOrgMembersForScorecard(
  organizationId: string,
): Promise<ScorecardMemberOption[]> {
  return getOrgMembersForScorecardCached(organizationId);
}

const getOrgMembersForScorecardCached = cache(
  async (organizationId: string): Promise<ScorecardMemberOption[]> => {
    return getOrgMemberOptions(organizationId);
  },
);
