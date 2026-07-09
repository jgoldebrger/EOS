"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createMetricActionSchema,
  createScorecardCategorySchema,
  createTagSchema,
  normalizeMetricInput,
  reorderMetricsSchema,
  setMetricTagsSchema,
  updateMetricActionSchema,
  upsertValueSchema,
} from "@/features/scorecard/schema";
import type {
  CreateCategoryResult,
  CreateMetricResult,
  CreateTagResult,
  FormulaBrokenRef,
  ScorecardActionResult,
} from "@/features/scorecard/types";
import {
  buildFormulaTokens,
  detectFormulaCycle,
  evaluateFormula,
  humanizeFormulaParseError,
  isFormulaIncompleteWhileTyping,
  metricRefKey,
  parseFormula,
  parseFormulaTokens,
  type FormulaMetricToken,
  type MetricRef,
} from "@/features/scorecard/formula";
import { getWeekStart, getLastNWeeks, getWeekStartForDate } from "@/features/scorecard/utils";
import { getChildSeatAssigneeUserIds, getDirectReportAssigneeUserIds } from "@/features/accountability/utils";
import {
  canManageOrg,
  canManageTeam,
  isOrgContributor,
} from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole, TeamRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

import { getCachedActionActor as getActorContext, isActionActorError, requireAdminActor } from "@/lib/auth/get-action-actor";

const getTeamRoleForUser = cache(
  async (teamId: string, userId: string): Promise<TeamRole | null> => {
    const supabase = await createClient();
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();

    return (membership?.team_role as TeamRole | undefined) ?? null;
  },
);

async function canManageMetric(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  orgRole: OrgRole,
  userId: string,
  teamId: string | null | undefined,
  ownerId?: string | null,
): Promise<boolean> {
  if (!isOrgContributor(orgRole)) {
    return false;
  }

  if (canManageOrg(orgRole)) {
    return true;
  }

  if (teamId) {
    const teamRole = await getTeamRoleForUser(teamId, userId);
    return teamRole !== null;
  }

  if (orgRole === "member") {
    return true;
  }

  return ownerId === userId;
}

async function canEditMetricFromRow(
  orgRole: OrgRole,
  userId: string,
  metric: {
    owner_id: string;
    team_id: string | null;
  },
): Promise<boolean> {
  if (orgRole === "viewer") {
    return false;
  }

  if (metric.owner_id === userId) {
    return true;
  }

  if (canManageOrg(orgRole)) {
    return true;
  }

  if (!metric.team_id) {
    return false;
  }

  const teamRole = await getTeamRoleForUser(metric.team_id, userId);
  if (!teamRole) {
    return false;
  }

  return canManageTeam(orgRole, teamRole);
}

async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  actorId: string,
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  entityType: "scorecard_metrics" | "scorecard_entries",
  entityId: string,
  metadata: Json,
) {
  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType,
    entityId,
    metadata,
  });
}

export interface FormulaMetricSearchResult {
  metricId: string;
  organizationId: string;
  name: string;
  teamName: string | null;
  teamId: string | null;
  orgName: string | null;
  label: string;
  token: string;
  suggested?: boolean;
  sameTeam?: boolean;
  directReport?: boolean;
}

async function validateFormulaForSave(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  metricId: string | null,
  formula: string,
  labels: Map<string, string>,
): Promise<{ tokens: FormulaMetricToken[] } | { error: string }> {
  const parsed = parseFormula(formula);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  if (parsed.refs.length === 0) {
    return { error: "Formula must reference at least one measurable" };
  }

  for (const ref of parsed.refs) {
    const { data: referenced } = await supabase
      .from("scorecard_metrics")
      .select("id, archived_at")
      .eq("id", ref.metricId)
      .eq("organization_id", ref.organizationId)
      .maybeSingle();

    if (!referenced || referenced.archived_at) {
      return { error: "Formula references an unknown or archived measurable" };
    }
  }

  const { data: formulaMetrics } = await supabase
    .from("scorecard_metrics")
    .select("id, organization_id, formula_tokens")
    .eq("datasource", "formula")
    .is("archived_at", null);

  const cycleError = detectFormulaCycle(
    metricId ?? crypto.randomUUID(),
    organizationId,
    parsed.refs,
    (formulaMetrics ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      formulaTokens: parseFormulaTokens(row.formula_tokens),
    })),
  );

  if (cycleError) {
    return { error: cycleError };
  }

  return {
    tokens: buildFormulaTokens(formula, labels),
  };
}

function buildFormulaMetricLabel(
  name: string,
  teamName: string | null,
  orgName: string | null,
  homeOrgId: string,
  metricOrgId: string,
): string {
  const teamPart = teamName ?? "Organization";
  if (metricOrgId !== homeOrgId && orgName) {
    return `${name} (${teamPart} · ${orgName})`;
  }
  return `${name} (${teamPart})`;
}

export async function searchFormulaMetrics(input: {
  organizationId: string;
  query?: string;
  includeOtherOrgs?: boolean;
  teamId?: string | null;
}): Promise<FormulaMetricSearchResult[]> {
  const actor = await getActorContext(input.organizationId);
  if ("error" in actor) {
    return [];
  }

  const search = input.query?.trim().toLowerCase() ?? "";
  const contextTeamId = input.teamId ?? null;
  const orgIds = new Set<string>([input.organizationId]);

  if (input.includeOtherOrgs !== false) {
    const { data: memberships } = await actor.supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", actor.user.id);

    for (const membership of memberships ?? []) {
      orgIds.add(membership.organization_id);
    }
  }

  const { data: orgRows } = await actor.supabase
    .from("organizations")
    .select("id, name")
    .in("id", Array.from(orgIds));

  const orgNameById = new Map((orgRows ?? []).map((org) => [org.id, org.name]));

  const { data: metrics } = await actor.supabase
    .from("scorecard_metrics")
    .select("id, organization_id, owner_id, team_id, name, teams(name)")
    .in("organization_id", Array.from(orgIds))
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (!metrics) {
    return [];
  }

  const { data: accountabilitySeats } = await actor.supabase
    .from("accountability_seats")
    .select("id, parent_id, assigned_user_id")
    .eq("organization_id", input.organizationId);

  const suggestedOwnerIds = getChildSeatAssigneeUserIds(
    accountabilitySeats ?? [],
    actor.user.id,
  );
  const directReportOwnerIds = getDirectReportAssigneeUserIds(
    accountabilitySeats ?? [],
    actor.user.id,
  );

  const results: FormulaMetricSearchResult[] = [];

  for (const row of metrics) {
    const teamJoin = row.teams as { name: string } | null;
    const teamName = teamJoin?.name ?? null;
    const teamId = row.team_id ?? null;
    const orgName = orgNameById.get(row.organization_id) ?? null;
    const label = buildFormulaMetricLabel(
      row.name,
      teamName,
      orgName,
      input.organizationId,
      row.organization_id,
    );
    const suggested = suggestedOwnerIds.has(row.owner_id);
    const sameTeam = Boolean(contextTeamId && teamId === contextTeamId);
    const directReport = directReportOwnerIds.has(row.owner_id);

    if (
      search &&
      !row.name.toLowerCase().includes(search) &&
      !(teamName?.toLowerCase().includes(search) ?? false) &&
      !(orgName?.toLowerCase().includes(search) ?? false)
    ) {
      continue;
    }

    results.push({
      metricId: row.id,
      organizationId: row.organization_id,
      name: row.name,
      teamName,
      teamId,
      orgName,
      label,
      token: `{{metric:${row.organization_id}:${row.id}}}`,
      suggested: suggested || undefined,
      sameTeam: sameTeam || undefined,
      directReport: directReport || undefined,
    });
  }

  results.sort((a, b) => {
    const rank = (result: FormulaMetricSearchResult) =>
      (result.suggested ? 8 : 0) +
      (result.sameTeam ? 4 : 0) +
      (result.directReport ? 2 : 0);

    const rankDiff = rank(b) - rank(a);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });

  return results.slice(0, 20);
}

export async function resolveFormulaMetricLabels(input: {
  organizationId: string;
  refs: MetricRef[];
}): Promise<FormulaMetricToken[]> {
  if (input.refs.length === 0) {
    return [];
  }

  const actor = await getActorContext(input.organizationId);
  if ("error" in actor) {
    return [];
  }

  const metricIds = [...new Set(input.refs.map((ref) => ref.metricId))];
  const { data: metrics } = await actor.supabase
    .from("scorecard_metrics")
    .select("id, organization_id, name, teams(name)")
    .in("id", metricIds)
    .is("archived_at", null);

  if (!metrics) {
    return [];
  }

  const orgIds = [...new Set(metrics.map((row) => row.organization_id))];
  const { data: orgRows } = await actor.supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds);

  const orgNameById = new Map((orgRows ?? []).map((org) => [org.id, org.name]));
  const metricById = new Map(metrics.map((row) => [row.id, row]));

  return input.refs.map((ref) => {
    const row = metricById.get(ref.metricId);
    if (!row || row.organization_id !== ref.organizationId) {
      return {
        type: "metric" as const,
        organizationId: ref.organizationId,
        metricId: ref.metricId,
      };
    }

    const teamJoin = row.teams as { name: string } | null;
    const teamName = teamJoin?.name ?? null;
    const orgName = orgNameById.get(row.organization_id) ?? null;

    return {
      type: "metric" as const,
      organizationId: ref.organizationId,
      metricId: ref.metricId,
      label: buildFormulaMetricLabel(
        row.name,
        teamName,
        orgName,
        input.organizationId,
        ref.organizationId,
      ),
    };
  });
}

export type { FormulaBrokenRef } from "@/features/scorecard/types";

export async function findBrokenFormulaReferences(input: {
  organizationId: string;
  formula: string;
}): Promise<FormulaBrokenRef[]> {
  const batch = await findBrokenFormulaReferencesForMetrics({
    organizationId: input.organizationId,
    metrics: [{ id: "__single__", formula: input.formula }],
  });
  return batch["__single__"] ?? [];
}

export async function findBrokenFormulaReferencesForMetrics(input: {
  organizationId: string;
  metrics: Array<{ id: string; formula: string | null }>;
}): Promise<Record<string, FormulaBrokenRef[]>> {
  const { getBrokenFormulaReferencesForMetrics } = await import(
    "@/features/scorecard/queries"
  );
  return getBrokenFormulaReferencesForMetrics(input);
}

export type FormulaPreviewResult =
  | {
      success: true;
      value: number | null;
      periodStart: string;
      brokenRefs: FormulaBrokenRef[];
    }
  | {
      success: false;
      error: string;
      brokenRefs: FormulaBrokenRef[];
    };

export async function previewFormula(input: {
  organizationId: string;
  formula: string;
}): Promise<FormulaPreviewResult> {
  const brokenRefs = await findBrokenFormulaReferences(input);
  const trimmed = input.formula.trim();

  if (!trimmed) {
    return { success: false, error: "Formula is required", brokenRefs };
  }

  if (isFormulaIncompleteWhileTyping(trimmed)) {
    return { success: false, error: "", brokenRefs };
  }

  const parsed = parseFormula(trimmed);
  if ("error" in parsed) {
    return {
      success: false,
      error: humanizeFormulaParseError(parsed.error, trimmed),
      brokenRefs,
    };
  }

  if (parsed.refs.length === 0) {
    return {
      success: false,
      error: "Formula must reference at least one measurable",
      brokenRefs,
    };
  }

  const actor = await getActorContext(input.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized", brokenRefs };
  }

  const currentWeek = getWeekStart(new Date());
  const { getValuesForMetrics } = await import("@/features/scorecard/queries");

  const depMetricIds = [...new Set(parsed.refs.map((ref) => ref.metricId))];
  const valuesByMetric = await getValuesForMetrics(
    depMetricIds,
    [currentWeek],
    "weekly",
  );

  let periodStart = currentWeek;
  let periodValues = new Map<string, number | null>();

  for (const ref of parsed.refs) {
    const cells = valuesByMetric[ref.metricId];
    const cell = cells?.find((entry) => entry.periodStart === currentWeek);
    periodValues.set(metricRefKey(ref.organizationId, ref.metricId), cell?.actual ?? null);
  }

  const hasCurrentWeekData = [...periodValues.values()].some((value) => value !== null);

  if (!hasCurrentWeekData && depMetricIds.length > 0) {
    const historyWeeks = (
      await import("@/features/scorecard/utils")
    ).getLastNWeeks(13);
    const historyValues = await getValuesForMetrics(
      depMetricIds,
      historyWeeks,
      "weekly",
    );

    for (let i = historyWeeks.length - 1; i >= 0; i -= 1) {
      const week = historyWeeks[i]!;
      const candidateValues = new Map<string, number | null>();
      let filled = false;

      for (const ref of parsed.refs) {
        const cells = historyValues[ref.metricId];
        const cell = cells?.find((entry) => entry.periodStart === week);
        const actual = cell?.actual ?? null;
        candidateValues.set(metricRefKey(ref.organizationId, ref.metricId), actual);
        if (actual !== null) {
          filled = true;
        }
      }

      if (filled) {
        periodStart = week;
        periodValues = candidateValues;
        break;
      }
    }
  }

  const value = evaluateFormula(parsed.ast, parsed.refs, periodValues);

  return {
    success: true,
    value,
    periodStart,
    brokenRefs,
  };
}

export async function syncFormulaMetricValues(input: {
  organizationId: string;
  metricIds: string[];
  periods: string[];
}): Promise<void> {
  if (input.metricIds.length === 0 || input.periods.length === 0) {
    return;
  }

  const actor = await getActorContext(input.organizationId);
  if ("error" in actor) {
    return;
  }

  const { syncFormulaMetricValuesToDb } = await import(
    "@/features/scorecard/queries"
  );

  await syncFormulaMetricValuesToDb(
    actor.supabase,
    input.organizationId,
    input.metricIds,
    input.periods,
    actor.user.id,
  );
}

function scheduleFormulaMetricSync(
  organizationId: string,
  metricIds: string[],
  periods?: string[],
) {
  if (metricIds.length === 0) {
    return;
  }

  after(() => {
    void syncFormulaMetricValues({
      organizationId,
      metricIds,
      periods: periods ?? getLastNWeeks(13),
    });
  });
}

function scheduleScorecardRevalidation(orgSlug: string, teamSlug?: string | null) {
  const scorecardPath = teamSlug
    ? `/org/${orgSlug}/teams/${teamSlug}/scorecard`
    : `/org/${orgSlug}/scorecard`;

  after(() => {
    revalidatePath(scorecardPath);
  });
}

export async function createScorecardCategory(
  input: unknown,
): Promise<CreateCategoryResult> {
  const parsed = createScorecardCategorySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid category details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const teamId = parsed.data.teamId ?? null;
  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    teamId,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create categories",
    };
  }

  const { data: existing } = await (
    actor.supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{ data: Array<{ display_order: number }> | null }>;
          };
        };
      };
    }
  )
    .from("scorecard_categories")
    .select("display_order")
    .eq("organization_id", parsed.data.organizationId)
    .order("display_order", { ascending: false });

  const nextOrder =
    existing && existing.length > 0 ? (existing[0]?.display_order ?? 0) + 1 : 0;

  const { data: category, error } = await (
    actor.supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => {
          select: (cols: string) => {
            single: () => Promise<{
              data: { id: string; name: string; color: string } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    }
  )
    .from("scorecard_categories")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: teamId,
      name: parsed.data.name,
      color: parsed.data.color,
      display_order: nextOrder,
      created_by: actor.user.id,
    })
    .select("id, name, color")
    .single();

  if (error || !category) {
    const detail = error?.message ?? "";
    if (process.env.NODE_ENV === "development") {
      console.error("[createScorecardCategory] insert failed:", error);
    }
    return {
      success: false,
      error: detail.includes("scorecard_categories")
        ? "Database schema is out of date. Run .\\scripts\\push-cloud-db.ps1 to apply pending migrations."
        : detail
          ? `Unable to create category: ${detail}`
          : "Unable to create category. Please try again.",
    };
  }

  if (parsed.data.orgSlug) {
    scheduleScorecardRevalidation(parsed.data.orgSlug, parsed.data.teamSlug);
  }

  return {
    success: true,
    category: {
      id: category.id,
      name: category.name,
      color: category.color,
    },
  };
}

export async function createTag(input: unknown): Promise<CreateTagResult> {
  const parsed = createTagSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid tag details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const teamId = parsed.data.teamId ?? null;
  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    teamId,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create tags",
    };
  }

  const { data: tag, error } = await actor.supabase
    .from("tags")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      color: parsed.data.color ?? null,
    })
    .select("id, name, color")
    .single();

  if (error || !tag) {
    const detail = error?.message ?? "";
    if (process.env.NODE_ENV === "development") {
      console.error("[createTag] insert failed:", error);
    }
    return {
      success: false,
      error: detail.includes("tags_organization_name_unique")
        ? "A tag with this name already exists"
        : detail.includes("tags")
          ? "Database schema is out of date. Run .\\scripts\\push-cloud-db.ps1 to apply pending migrations."
          : detail
            ? `Unable to create tag: ${detail}`
            : "Unable to create tag. Please try again.",
    };
  }

  if (parsed.data.orgSlug) {
    scheduleScorecardRevalidation(parsed.data.orgSlug, parsed.data.teamSlug);
  }

  return {
    success: true,
    tag: {
      id: tag.id,
      name: tag.name,
      color: tag.color,
    },
  };
}

async function replaceMetricTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  metricId: string,
  tagIds: string[],
): Promise<{ error?: string }> {
  if (tagIds.length > 0) {
    const { data: validTags, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("organization_id", organizationId)
      .in("id", tagIds);

    if (tagError) {
      return { error: "Unable to validate tags" };
    }

    if ((validTags ?? []).length !== tagIds.length) {
      return { error: "One or more tags are invalid" };
    }
  }

  const { error: deleteError } = await supabase
    .from("scorecard_metric_tags")
    .delete()
    .eq("metric_id", metricId);

  if (deleteError) {
    return { error: "Unable to update metric tags" };
  }

  if (tagIds.length === 0) {
    return {};
  }

  const { error: insertError } = await supabase.from("scorecard_metric_tags").insert(
    tagIds.map((tagId) => ({
      metric_id: metricId,
      tag_id: tagId,
    })),
  );

  if (insertError) {
    return { error: "Unable to update metric tags" };
  }

  return {};
}

export async function setMetricTags(input: unknown): Promise<ScorecardActionResult> {
  const parsed = setMetricTagsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid tag assignment",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: metric } = await actor.supabase
    .from("scorecard_metrics")
    .select("team_id, owner_id")
    .eq("id", parsed.data.metricId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!metric) {
    return { success: false, error: "Metric not found" };
  }

  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    metric.team_id,
    metric.owner_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update tags on this metric",
    };
  }

  const uniqueTagIds = [...new Set(parsed.data.tagIds)];
  const tagResult = await replaceMetricTags(
    actor.supabase,
    parsed.data.organizationId,
    parsed.data.metricId,
    uniqueTagIds,
  );

  if (tagResult.error) {
    return { success: false, error: tagResult.error };
  }

  if (parsed.data.orgSlug) {
    scheduleScorecardRevalidation(parsed.data.orgSlug, parsed.data.teamSlug);
  }

  return { success: true };
}

export async function createMetric(input: unknown): Promise<CreateMetricResult> {
  const startedAt = Date.now();
  const mark = (step: string) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[createMetric] ${step}: +${Date.now() - startedAt}ms`);
    }
  };

  const parsed = createMetricActionSchema.safeParse(input);
  mark("parsed");

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid metric details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  mark("actor");
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    parsed.data.teamId ?? null,
  );
  mark("permission");

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create metrics",
    };
  }

  const normalized = normalizeMetricInput(parsed.data);
  const datasource = parsed.data.datasource ?? "manual";
  let formulaTokens: FormulaMetricToken[] | null = null;
  let formulaText: string | null = null;

  if (datasource === "formula") {
    const searchResults = await searchFormulaMetrics({
      organizationId: parsed.data.organizationId,
      includeOtherOrgs: true,
    });
    const labelByKey = new Map(
      searchResults.map((result) => [
        `${result.organizationId}:${result.metricId}`,
        result.label,
      ]),
    );
    const formulaValidation = await validateFormulaForSave(
      actor.supabase,
      parsed.data.organizationId,
      null,
      parsed.data.formula?.trim() ?? "",
      labelByKey,
    );
    if ("error" in formulaValidation) {
      return { success: false, error: formulaValidation.error };
    }
    formulaTokens = formulaValidation.tokens;
    formulaText = parsed.data.formula?.trim() ?? null;
  }

  const { data: metric, error } = await actor.supabase
    .from("scorecard_metrics")
    .insert({
      organization_id: normalized.organizationId,
      team_id: normalized.teamId ?? null,
      owner_id: normalized.ownerId,
      name: normalized.name,
      unit: normalized.unit ?? null,
      description: normalized.description ?? null,
      category_id: normalized.categoryId ?? null,
      value_type: normalized.valueType,
      time_kind: normalized.timeKind,
      target_operator: normalized.targetOperator,
      entry_cadence: normalized.entryCadence,
      weekly_rollup_method: normalized.weeklyRollupMethod,
      target_rule: normalized.targetRule,
      target_value: normalized.targetValue ?? null,
      target_min: normalized.targetMin ?? null,
      target_max: normalized.targetMax ?? null,
      tolerance_percent: normalized.tolerancePercent,
      display_target: normalized.displayTarget,
      display_order: normalized.displayOrder ?? 0,
      datasource,
      formula: formulaText,
      formula_tokens: formulaTokens as unknown as Json,
      created_by: actor.user.id,
    })
    .select("id")
    .single();
  mark("insert");

  if (error || !metric) {
    const detail = error?.message ?? "";
    const needsMigration =
      detail.includes("time_kind") ||
      detail.includes("value_type") ||
      detail.includes("entry_cadence") ||
      detail.includes("datasource") ||
      detail.includes("formula");

    if (process.env.NODE_ENV === "development") {
      console.error("[createMetric] insert failed:", error);
    }

    return {
      success: false,
      error: needsMigration
        ? "Database schema is out of date. Run .\\scripts\\push-cloud-db.ps1 to apply pending migrations."
        : detail
          ? `Unable to create metric: ${detail}`
          : "Unable to create metric. Please try again.",
    };
  }

  void writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    "scorecard_metrics",
    metric.id,
    { name: normalized.name, targetRule: normalized.targetRule } as Json,
  );
  mark("audit (async)");

  const tagIds = parsed.data.tagIds ?? [];
  if (tagIds.length > 0) {
    const tagResult = await replaceMetricTags(
      actor.supabase,
      parsed.data.organizationId,
      metric.id,
      [...new Set(tagIds)],
    );
    if (tagResult.error) {
      return { success: false, error: tagResult.error };
    }
  }

  const orgSlug = parsed.data.orgSlug;
  mark("org slug");

  if (orgSlug) {
    scheduleScorecardRevalidation(orgSlug, parsed.data.teamSlug);
  }
  mark("revalidate (deferred)");

  if (datasource === "formula") {
    scheduleFormulaMetricSync(parsed.data.organizationId, [metric.id]);
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[createMetric] done in ${Date.now() - startedAt}ms`);
  }

  return { success: true, metricId: metric.id };
}

export async function updateMetric(input: unknown): Promise<ScorecardActionResult> {
  const parsed = updateMetricActionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid metric details",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: existing } = await actor.supabase
    .from("scorecard_metrics")
    .select("team_id, owner_id")
    .eq("id", parsed.data.metricId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Metric not found" };
  }

  const teamId = parsed.data.teamId ?? existing.team_id;
  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    teamId,
    existing.owner_id,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this metric",
    };
  }

  const updates: TablesUpdate<"scorecard_metrics"> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.teamId !== undefined) updates.team_id = parsed.data.teamId;
  if (parsed.data.ownerId !== undefined) updates.owner_id = parsed.data.ownerId;
  if (parsed.data.unit !== undefined) updates.unit = parsed.data.unit;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.categoryId !== undefined) updates.category_id = parsed.data.categoryId;
  if (parsed.data.tolerancePercent !== undefined) {
    updates.tolerance_percent = parsed.data.tolerancePercent;
  }
  if (parsed.data.displayOrder !== undefined) updates.display_order = parsed.data.displayOrder;
  if (parsed.data.archived !== undefined) {
    updates.archived_at = parsed.data.archived ? new Date().toISOString() : null;
  }

  let shouldSyncFormula = false;

  if (parsed.data.datasource !== undefined || parsed.data.formula !== undefined) {
    const { data: currentDatasource } = await actor.supabase
      .from("scorecard_metrics")
      .select("datasource, formula")
      .eq("id", parsed.data.metricId)
      .single();

    const nextDatasource = parsed.data.datasource ?? currentDatasource?.datasource ?? "manual";
    updates.datasource = nextDatasource;

    if (nextDatasource === "formula") {
      const formula = (parsed.data.formula ?? currentDatasource?.formula ?? "").trim();
      const searchResults = await searchFormulaMetrics({
        organizationId: parsed.data.organizationId,
        includeOtherOrgs: true,
      });
      const labelByKey = new Map(
        searchResults.map((result) => [
          `${result.organizationId}:${result.metricId}`,
          result.label,
        ]),
      );
      const formulaValidation = await validateFormulaForSave(
        actor.supabase,
        parsed.data.organizationId,
        parsed.data.metricId,
        formula,
        labelByKey,
      );
      if ("error" in formulaValidation) {
        return { success: false, error: formulaValidation.error };
      }
      updates.formula = formula;
      updates.formula_tokens = formulaValidation.tokens as unknown as Json;
      shouldSyncFormula = true;
    } else {
      updates.formula = null;
      updates.formula_tokens = null;
    }
  }

  const hasTargetFields =
    parsed.data.valueType !== undefined ||
    parsed.data.targetOperator !== undefined ||
    parsed.data.targetValue !== undefined ||
    parsed.data.targetMin !== undefined ||
    parsed.data.targetMax !== undefined ||
    parsed.data.entryCadence !== undefined ||
    parsed.data.weeklyRollupMethod !== undefined;

  if (hasTargetFields) {
    const { data: current } = await actor.supabase
      .from("scorecard_metrics")
      .select(
        "value_type, time_kind, target_operator, entry_cadence, weekly_rollup_method, target_rule, target_value, target_min, target_max",
      )
      .eq("id", parsed.data.metricId)
      .single();

    const merged = normalizeMetricInput({
      organizationId: parsed.data.organizationId,
      ownerId: parsed.data.ownerId ?? "00000000-0000-0000-0000-000000000000",
      name: parsed.data.name ?? "metric",
      valueType:
        (parsed.data.valueType ??
          current?.value_type ??
          "number") as import("@/features/scorecard/utils").ValueType,
      timeKind:
        (parsed.data.timeKind ??
          current?.time_kind ??
          "duration") as import("@/features/scorecard/utils").TimeKind,
      targetOperator:
        (parsed.data.targetOperator ??
          current?.target_operator ??
          ">=") as import("@/features/scorecard/utils").TargetOperator,
      entryCadence:
        (parsed.data.entryCadence ??
          current?.entry_cadence ??
          "weekly") as import("@/features/scorecard/utils").EntryCadence,
      weeklyRollupMethod:
        parsed.data.weeklyRollupMethod !== undefined
          ? parsed.data.weeklyRollupMethod
          : ((current?.weekly_rollup_method ?? null) as import("@/features/scorecard/utils").RollupMethod | null),
      targetValue:
        parsed.data.targetValue !== undefined
          ? parsed.data.targetValue
          : current?.target_value === null || current?.target_value === undefined
            ? null
            : Number(current.target_value),
      targetMin:
        parsed.data.targetMin !== undefined
          ? parsed.data.targetMin
          : current?.target_min === null || current?.target_min === undefined
            ? null
            : Number(current.target_min),
      targetMax:
        parsed.data.targetMax !== undefined
          ? parsed.data.targetMax
          : current?.target_max === null || current?.target_max === undefined
            ? null
            : Number(current.target_max),
      tolerancePercent: parsed.data.tolerancePercent ?? 10,
    });

    updates.value_type = merged.valueType;
    updates.time_kind = merged.timeKind;
    updates.target_operator = merged.targetOperator;
    updates.entry_cadence = merged.entryCadence;
    updates.weekly_rollup_method = merged.weeklyRollupMethod;
    updates.target_rule = merged.targetRule;
    updates.target_value = merged.targetValue ?? null;
    updates.target_min = merged.targetMin ?? null;
    updates.target_max = merged.targetMax ?? null;
    updates.display_target = merged.displayTarget;

    const oldTargetValue =
      current?.target_value === null || current?.target_value === undefined
        ? null
        : Number(current.target_value);
    const newTargetValue = merged.targetValue ?? null;
    const targetValueChanged =
      parsed.data.targetValue !== undefined && oldTargetValue !== newTargetValue;

    if (targetValueChanged && parsed.data.applyTargetToPastEntries !== true) {
      await actor.supabase
        .from("scorecard_values")
        .update({ target_snapshot: oldTargetValue })
        .eq("metric_id", parsed.data.metricId)
        .eq("organization_id", parsed.data.organizationId);
    }
  } else {
    if (parsed.data.targetRule !== undefined) updates.target_rule = parsed.data.targetRule;
    if (parsed.data.targetValue !== undefined) updates.target_value = parsed.data.targetValue;
    if (parsed.data.targetMin !== undefined) updates.target_min = parsed.data.targetMin;
    if (parsed.data.targetMax !== undefined) updates.target_max = parsed.data.targetMax;
  }

  const { error } = await actor.supabase
    .from("scorecard_metrics")
    .update(updates)
    .eq("id", parsed.data.metricId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) {
    return {
      success: false,
      error: "Unable to update metric. Please try again.",
    };
  }

  if (
    parsed.data.applyTargetToPastEntries === true &&
    hasTargetFields &&
    parsed.data.targetValue !== undefined
  ) {
    const newSnapshot =
      updates.target_value === null || updates.target_value === undefined
        ? null
        : Number(updates.target_value);

    await actor.supabase
      .from("scorecard_values")
      .update({ target_snapshot: newSnapshot })
      .eq("metric_id", parsed.data.metricId)
      .eq("organization_id", parsed.data.organizationId);
  }

  void writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    "scorecard_metrics",
    parsed.data.metricId,
    updates as Json,
  );

  const orgSlug = parsed.data.orgSlug;

  if (orgSlug) {
    scheduleScorecardRevalidation(orgSlug, parsed.data.teamSlug);
  }

  if (shouldSyncFormula) {
    scheduleFormulaMetricSync(parsed.data.organizationId, [parsed.data.metricId]);
  }

  return { success: true };
}

export async function upsertValue(input: unknown): Promise<ScorecardActionResult> {
  const parsed = upsertValueSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid value",
    };
  }

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const { data: metric } = await actor.supabase
    .from("scorecard_metrics")
    .select("target_value, entry_cadence, owner_id, team_id, datasource")
    .eq("id", parsed.data.metricId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!metric) {
    return { success: false, error: "Metric not found" };
  }

  if (metric.datasource === "formula") {
    return {
      success: false,
      error: "Formula measurables are calculated automatically and cannot be edited manually",
    };
  }

  const allowed = await canEditMetricFromRow(actor.orgRole, actor.user.id, metric);

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this value",
    };
  }

  const periodType =
    parsed.data.periodType ??
    (metric.entry_cadence === "daily" ? "daily" : "weekly");

  if (metric.entry_cadence === "daily" && periodType === "weekly") {
    return {
      success: false,
      error: "Weekly values for daily metrics are computed automatically",
    };
  }

  const { data: value, error } = await actor.supabase
    .from("scorecard_values")
    .upsert(
      {
        organization_id: parsed.data.organizationId,
        metric_id: parsed.data.metricId,
        period_start: parsed.data.periodStart,
        period_type: periodType,
        actual: parsed.data.actual,
        target_snapshot: metric.target_value,
        status_override: parsed.data.statusOverride ?? null,
        notes: parsed.data.notes ?? null,
        created_by: actor.user.id,
      },
      { onConflict: "metric_id,period_start,period_type" },
    )
    .select("id")
    .single();

  if (error || !value) {
    return {
      success: false,
      error: "Unable to save value. Please try again.",
    };
  }

  void writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    "scorecard_entries",
    value.id,
    {
      metricId: parsed.data.metricId,
      periodStart: parsed.data.periodStart,
      actual: parsed.data.actual,
    } as Json,
  );

  if (parsed.data.orgSlug) {
    scheduleScorecardRevalidation(parsed.data.orgSlug, parsed.data.teamSlug);
  }

  const { findFormulaDependentMetricIds } = await import(
    "@/features/scorecard/queries"
  );
  const dependentIds = await findFormulaDependentMetricIds(
    actor.supabase,
    parsed.data.organizationId,
    [parsed.data.metricId],
  );

  if (dependentIds.length > 0) {
    const syncPeriod =
      periodType === "daily"
        ? getWeekStartForDate(parsed.data.periodStart)
        : parsed.data.periodStart;
    scheduleFormulaMetricSync(
      parsed.data.organizationId,
      dependentIds,
      [syncPeriod],
    );
  }

  return { success: true };
}

export async function reorderMetrics(input: unknown): Promise<ScorecardActionResult> {
  const parsed = reorderMetricsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reorder request",
    };
  }

  const actor = await requireAdminActor(parsed.data.organizationId);
  if (isActionActorError(actor)) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  const updates = parsed.data.orderedMetricIds.map((metricId, index) =>
    actor.supabase
      .from("scorecard_metrics")
      .update({ display_order: index })
      .eq("id", metricId)
      .eq("organization_id", parsed.data.organizationId),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    return {
      success: false,
      error: "Unable to reorder metrics. Please try again.",
    };
  }

  if (parsed.data.orgSlug) {
    scheduleScorecardRevalidation(parsed.data.orgSlug, parsed.data.teamSlug);
  }

  return { success: true };
}

export async function exportScorecardCsv(input: {
  orgSlug: string;
  teamSlug: string;
  periodType: string;
  range: number;
}): Promise<{ success: true; csv: string } | { success: false; error: string }> {
  const { getMetricsForOrg, getValuesForMetrics } = await import(
    "@/features/scorecard/queries"
  );
  const { getPeriodColumns, formatMetricDisplayTarget } = await import(
    "@/features/scorecard/utils"
  );
  const { requireTeamAccess } = await import("@/lib/auth/require-team-access");

  try {
    const teamAccess = await requireTeamAccess(input.orgSlug, input.teamSlug);
    const periodType = input.periodType as import("@/features/scorecard/utils").PeriodType;
    const periods = getPeriodColumns(periodType, input.range);

    const metrics = await getMetricsForOrg(teamAccess.orgId, {
      teamId: teamAccess.teamId,
      periodType,
    });

    const valuesByMetric = await getValuesForMetrics(
      metrics.map((m) => m.id),
      periods,
      periodType,
    );

    const header = ["Name", "Team", "Category", "Target", ...periods].join(",");
    const rows = metrics.map((metric) => {
      const values = valuesByMetric[metric.id] ?? [];
      const target = formatMetricDisplayTarget(metric);
      const cells = values.map((v) =>
        v.actual === null ? "" : String(v.actual),
      );
      return [
        `"${metric.name.replace(/"/g, '""')}"`,
        `"${(metric.teamName ?? "").replace(/"/g, '""')}"`,
        `"${(metric.categoryName ?? "").replace(/"/g, '""')}"`,
        `"${target}"`,
        ...cells,
      ].join(",");
    });

    return { success: true, csv: [header, ...rows].join("\n") };
  } catch {
    return { success: false, error: "Unable to export scorecard" };
  }
}
