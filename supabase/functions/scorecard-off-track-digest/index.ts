import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "npm:@supabase/server/core";

interface MetricRow {
  id: string;
  name: string;
  team_id: string | null;
  owner_id: string;
  target_rule: string;
  target_operator: string | null;
  target_value: number | null;
  target_min: number | null;
  target_max: number | null;
  tolerance_percent: number | null;
  value_type: string | null;
  time_kind: string | null;
}

interface ValueRow {
  metric_id: string;
  actual: number | null;
  status_override: string | null;
  target_snapshot: number | null;
  period_start: string;
}

interface OffTrackMetric {
  metricId: string;
  metricName: string;
  status: "red" | "yellow";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function verifySecret(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  const scopedSecret = Deno.env.get("SCORECARD_CRON_SECRET");
  const fallbackSecret =
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const expected = scopedSecret ?? fallbackSecret;

  if (!auth || !expected) {
    return false;
  }

  return auth === `Bearer ${expected}`;
}

function getWeekStartIso(date: Date = new Date()): string {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function latestValueByMetric(values: ValueRow[]): Map<string, ValueRow> {
  const sorted = [...values].sort((a, b) => b.period_start.localeCompare(a.period_start));
  const map = new Map<string, ValueRow>();
  for (const value of sorted) {
    if (!map.has(value.metric_id)) {
      map.set(value.metric_id, value);
    }
  }
  return map;
}

function resolveStatus(metric: MetricRow, stored: ValueRow | undefined): string {
  if (!stored) return "na";
  const override = stored.status_override;
  if (override === "green" || override === "yellow" || override === "red") {
    return override;
  }

  const actual =
    stored.actual === null || stored.actual === undefined ? null : Number(stored.actual);
  const target =
    stored.target_snapshot === null || stored.target_snapshot === undefined
      ? metric.target_value === null || metric.target_value === undefined
        ? null
        : Number(metric.target_value)
      : Number(stored.target_snapshot);

  if (actual === null || target === null) return "na";

  const operator = metric.target_operator ?? ">=";
  const tolerance = metric.tolerance_percent ?? 0;
  const margin = Math.abs(target) * (tolerance / 100);

  switch (operator) {
    case ">=":
      if (actual >= target) return "green";
      if (actual >= target - margin) return "yellow";
      return "red";
    case "<=":
      if (actual <= target) return "green";
      if (actual <= target + margin) return "yellow";
      return "red";
    case ">":
      if (actual > target) return "green";
      return "red";
    case "<":
      if (actual < target) return "green";
      return "red";
    default:
      return Math.abs(actual - target) <= margin ? "green" : "red";
  }
}

async function sendNotification(payload: {
  to: string;
  subject: string;
  body: string;
  actionUrl?: string;
  type?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey =
    Deno.env.get("NOTIFICATIONS_CRON_SECRET") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) {
    return false;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-notifications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json().catch(() => ({}));
  return result.sent === true;
}

const handler = {
  async fetch(req: Request): Promise<Response> {
    if (!verifySecret(req)) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const admin = createAdminClient();
    const weekStart = getWeekStartIso();
    let organizationsProcessed = 0;
    let digestsSent = 0;

    const { data: organizations, error: orgError } = await admin
      .from("organizations")
      .select("id, slug");

    if (orgError) {
      return jsonResponse({ error: "load_failed", detail: orgError.message }, 500);
    }

    for (const org of organizations ?? []) {
      organizationsProcessed += 1;

      const [{ data: metrics }, { data: values }] = await Promise.all([
        admin
          .from("scorecard_metrics")
          .select(
            "id, name, team_id, owner_id, target_rule, target_operator, target_value, target_min, target_max, tolerance_percent, value_type, time_kind",
          )
          .eq("organization_id", org.id)
          .is("archived_at", null),
        admin
          .from("scorecard_values")
          .select("metric_id, actual, status_override, target_snapshot, period_start")
          .eq("organization_id", org.id)
          .order("period_start", { ascending: false }),
      ]);

      const latestByMetric = latestValueByMetric((values ?? []) as ValueRow[]);
      const byOwner = new Map<string, OffTrackMetric[]>();

      for (const metric of (metrics ?? []) as MetricRow[]) {
        const status = resolveStatus(metric, latestByMetric.get(metric.id));
        if (status !== "red" && status !== "yellow") {
          continue;
        }

        const existing = byOwner.get(metric.owner_id) ?? [];
        existing.push({
          metricId: metric.id,
          metricName: metric.name,
          status,
        });
        byOwner.set(metric.owner_id, existing);
      }

      if (byOwner.size === 0) {
        continue;
      }

      for (const [ownerId, offTrackMetrics] of byOwner.entries()) {
        const { data: existingDigest } = await admin
          .from("inbox_items")
          .select("id")
          .eq("organization_id", org.id)
          .eq("assignee_id", ownerId)
          .eq("source_type", "scorecard_digest")
          .gte("created_at", weekStart)
          .limit(1);

        if ((existingDigest ?? []).length > 0) {
          continue;
        }

        const metricLines = offTrackMetrics
          .map((metric) => `• ${metric.metricName} (${metric.status})`)
          .join("\n");
        const title = `${offTrackMetrics.length} scorecard metric${offTrackMetrics.length === 1 ? "" : "s"} off track`;
        const body = `Weekly accountability digest:\n${metricLines}`;
        const actionUrl = `/org/${org.slug}/scorecard`;

        await admin.from("inbox_items").insert({
          organization_id: org.id,
          assignee_id: ownerId,
          title,
          body,
          source_type: "scorecard_digest",
          source_id: null,
          action_url: actionUrl,
        });

        const { data: userData } = await admin.auth.admin.getUserById(ownerId);
        const email = userData.user?.email;
        if (email) {
          await sendNotification({
            to: email,
            subject: title,
            body,
            actionUrl,
            type: "scorecard_digest",
          });
        }

        digestsSent += 1;
      }
    }

    return jsonResponse({
      success: true,
      organizationsProcessed,
      digestsSent,
    });
  },
};

export default handler;
