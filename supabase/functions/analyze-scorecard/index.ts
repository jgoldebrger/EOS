import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "https://esm.sh/zod@3.24.2";
import {
  callOpenAI,
  jsonResponse,
  logAiRun,
  persistSuggestions,
  requireUserId,
  verifyOrgAccess,
} from "../_shared/edge-utils.ts";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  metrics: z
    .array(
      z.object({
        metricId: z.string().uuid(),
        name: z.string().trim().min(1).max(200),
        targetRule: z.string().trim().min(1),
        weeks: z.array(
          z.object({
            periodStart: z.string(),
            actual: z.number().nullable(),
            target: z.number().nullable(),
            status: z.string(),
          }),
        ),
      }),
    )
    .min(1)
    .max(50),
});

const outputSchema = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          metricId: { type: ["string", "null"] },
          metricName: { type: "string" },
          insight: { type: "string" },
          trend: {
            type: "string",
            enum: ["improving", "declining", "stable", "volatile"],
          },
          severity: {
            type: "string",
            enum: ["info", "warning", "critical"],
          },
        },
        required: ["metricId", "metricName", "insight", "trend", "severity"],
        additionalProperties: false,
      },
    },
  },
  required: ["insights"],
  additionalProperties: false,
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "invalid_input", success: false }, 405);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_input", success: false }, 400);
    }

    const parsed = inputSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_input", success: false }, 400);
    }

    const userId = ctx.userClaims?.id;
    const unauthorized = requireUserId(userId);
    if (unauthorized) {
      return unauthorized;
    }

    const { organizationId, metrics } = parsed.data;

    const hasAccess = await verifyOrgAccess(ctx.supabase, organizationId, userId);
    if (!hasAccess) {
      return jsonResponse({ error: "access_denied", success: false }, 403);
    }

    const aiResult = await callOpenAI(
      "You analyze EOS scorecard trends. Identify meaningful patterns and risks from weekly metric data.",
      JSON.stringify({ metrics }),
      "scorecard_insights",
      outputSchema,
    );

    if ("error" in aiResult) {
      return jsonResponse({ error: aiResult.error, success: false }, 503);
    }

    const insights = Array.isArray(aiResult.data.insights)
      ? aiResult.data.insights
      : [];

    const aiRunId = await logAiRun(ctx.supabase, {
      organizationId,
      actorId: userId,
      functionName: "analyze-scorecard",
      inputSummary: `metrics:${metrics.length}`,
      outputSummary: `${insights.length} insights`,
      status: "completed",
    });

    if (!aiRunId) {
      return jsonResponse({ error: "ai_run_failed", success: false }, 500);
    }

    const suggestionRows = insights.map((item: Record<string, unknown>) => ({
      suggestion_type: "scorecard_insight",
      payload: {
        metricId: item.metricId ? String(item.metricId) : null,
        metricName: String(item.metricName ?? "Metric"),
        insight: String(item.insight ?? ""),
        trend: String(item.trend ?? "stable"),
        severity: String(item.severity ?? "info"),
      },
    }));

    const suggestions = await persistSuggestions(
      ctx.supabase,
      organizationId,
      aiRunId,
      suggestionRows,
    );

    return jsonResponse({
      success: true,
      aiRunId,
      suggestions,
    });
  }),
};
