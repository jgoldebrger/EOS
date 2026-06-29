"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createMetricSchema,
  reorderMetricsSchema,
  updateMetricSchema,
  upsertValueSchema,
} from "@/features/scorecard/schema";
import type { CreateMetricResult, ScorecardActionResult } from "@/features/scorecard/types";
import { canManageOrg, canManageTeam } from "@/lib/permissions/checks";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { OrgRole, TeamRole } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";
import { logAuditEvent } from "@/lib/audit";

async function getActorContext(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in" } as const;
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "You do not have access to this organization" } as const;
  }

  return {
    supabase,
    user,
    orgRole: membership.org_role as OrgRole,
  } as const;
}

async function canManageMetric(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgRole: OrgRole,
  userId: string,
  teamId: string | null | undefined,
): Promise<boolean> {
  if (canManageOrg(orgRole)) {
    return true;
  }

  if (!teamId) {
    return false;
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return false;
  }

  return canManageTeam(orgRole, membership.team_role as TeamRole);
}

async function canEditMetricValue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  orgRole: OrgRole,
  userId: string,
  metricId: string,
): Promise<boolean> {
  if (orgRole === "viewer") {
    return false;
  }

  const { data: metric } = await supabase
    .from("scorecard_metrics")
    .select("owner_id, team_id, organization_id")
    .eq("id", metricId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!metric) {
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

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_role")
    .eq("team_id", metric.team_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return false;
  }

  return canManageTeam(orgRole, membership.team_role as TeamRole);
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

async function revalidateScorecard(orgSlug: string) {
  revalidatePath(`/org/${orgSlug}/scorecard`);
}

export async function createMetric(input: unknown): Promise<CreateMetricResult> {
  const parsed = createMetricSchema.safeParse(input);

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

  const allowed = await canManageMetric(
    actor.supabase,
    actor.orgRole,
    actor.user.id,
    parsed.data.teamId ?? null,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to create metrics",
    };
  }

  const { data: metric, error } = await actor.supabase
    .from("scorecard_metrics")
    .insert({
      organization_id: parsed.data.organizationId,
      team_id: parsed.data.teamId ?? null,
      owner_id: parsed.data.ownerId,
      name: parsed.data.name,
      unit: parsed.data.unit ?? null,
      description: parsed.data.description ?? null,
      target_rule: parsed.data.targetRule,
      target_value: parsed.data.targetValue ?? null,
      target_min: parsed.data.targetMin ?? null,
      target_max: parsed.data.targetMax ?? null,
      tolerance_percent: parsed.data.tolerancePercent,
      display_order: parsed.data.displayOrder ?? 0,
      created_by: actor.user.id,
    })
    .select("id")
    .single();

  if (error || !metric) {
    return {
      success: false,
      error: "Unable to create metric. Please try again.",
    };
  }

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.CREATE,
    "scorecard_metrics",
    metric.id,
    { name: parsed.data.name, targetRule: parsed.data.targetRule } as Json,
  );

  const { data: orgRow } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (orgRow?.slug) {
    await revalidateScorecard(orgRow.slug);
  }

  return { success: true, metricId: metric.id };
}

export async function updateMetric(input: unknown): Promise<ScorecardActionResult> {
  const parsed = updateMetricSchema.safeParse(input);

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
    .select("team_id")
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
  if (parsed.data.targetRule !== undefined) updates.target_rule = parsed.data.targetRule;
  if (parsed.data.targetValue !== undefined) updates.target_value = parsed.data.targetValue;
  if (parsed.data.targetMin !== undefined) updates.target_min = parsed.data.targetMin;
  if (parsed.data.targetMax !== undefined) updates.target_max = parsed.data.targetMax;
  if (parsed.data.tolerancePercent !== undefined) {
    updates.tolerance_percent = parsed.data.tolerancePercent;
  }
  if (parsed.data.displayOrder !== undefined) updates.display_order = parsed.data.displayOrder;
  if (parsed.data.archived !== undefined) {
    updates.archived_at = parsed.data.archived ? new Date().toISOString() : null;
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

  await writeAudit(
    actor.supabase,
    parsed.data.organizationId,
    actor.user.id,
    AUDIT_ACTIONS.UPDATE,
    "scorecard_metrics",
    parsed.data.metricId,
    updates as Json,
  );

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateScorecard(org.slug);
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

  const allowed = await canEditMetricValue(
    actor.supabase,
    parsed.data.organizationId,
    actor.orgRole,
    actor.user.id,
    parsed.data.metricId,
  );

  if (!allowed) {
    return {
      success: false,
      error: "You do not have permission to update this value",
    };
  }

  const { data: metric } = await actor.supabase
    .from("scorecard_metrics")
    .select("target_value")
    .eq("id", parsed.data.metricId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!metric) {
    return { success: false, error: "Metric not found" };
  }

  const { data: value, error } = await actor.supabase
    .from("scorecard_values")
    .upsert(
      {
        organization_id: parsed.data.organizationId,
        metric_id: parsed.data.metricId,
        period_start: parsed.data.periodStart,
        actual: parsed.data.actual,
        target_snapshot: metric.target_value,
        status_override: parsed.data.statusOverride ?? null,
        notes: parsed.data.notes ?? null,
        created_by: actor.user.id,
      },
      { onConflict: "metric_id,period_start" },
    )
    .select("id")
    .single();

  if (error || !value) {
    return {
      success: false,
      error: "Unable to save value. Please try again.",
    };
  }

  await writeAudit(
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

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateScorecard(org.slug);
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

  const actor = await getActorContext(parsed.data.organizationId);
  if ("error" in actor) {
    return { success: false, error: actor.error ?? "Unauthorized" };
  }

  if (!canManageOrg(actor.orgRole)) {
    return {
      success: false,
      error: "Only organization admins can reorder metrics",
    };
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

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("slug")
    .eq("id", parsed.data.organizationId)
    .single();

  if (org?.slug) {
    await revalidateScorecard(org.slug);
  }

  return { success: true };
}
