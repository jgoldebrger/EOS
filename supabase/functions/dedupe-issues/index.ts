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
  issues: z
    .array(
      z.object({
        issueId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .min(2)
    .max(100),
});

const outputSchema = {
  type: "object",
  properties: {
    merges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          primaryIssueId: { type: "string" },
          mergeIssueIds: {
            type: "array",
            items: { type: "string" },
          },
          mergedTitle: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["primaryIssueId", "mergeIssueIds", "mergedTitle", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["merges"],
  additionalProperties: false,
};

const handler = {
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

    const { organizationId, issues } = parsed.data;

    const hasAccess = await verifyOrgAccess(ctx.supabase, organizationId, userId);
    if (!hasAccess) {
      return jsonResponse({ error: "access_denied", success: false }, 403);
    }

    const aiResult = await callOpenAI(
      "Identify duplicate or overlapping EOS issues that should be merged. Suggest merge groups with a consolidated title.",
      JSON.stringify({ issues }),
      "issue_merges",
      outputSchema,
    );

    if ("error" in aiResult) {
      return jsonResponse({ error: aiResult.error, success: false }, 503);
    }

    const merges = Array.isArray(aiResult.data.merges) ? aiResult.data.merges : [];

    const aiRunId = await logAiRun(ctx.supabase, {
      organizationId,
      actorId: userId,
      functionName: "dedupe-issues",
      inputSummary: `issues:${issues.length}`,
      outputSummary: `${merges.length} merge groups`,
      status: "completed",
    });

    if (!aiRunId) {
      return jsonResponse({ error: "ai_run_failed", success: false }, 500);
    }

    const suggestionRows = merges.map((item: Record<string, unknown>) => ({
      suggestion_type: "issue_merge",
      payload: {
        primaryIssueId: String(item.primaryIssueId ?? ""),
        mergeIssueIds: Array.isArray(item.mergeIssueIds)
          ? item.mergeIssueIds.map(String)
          : [],
        mergedTitle: String(item.mergedTitle ?? ""),
        rationale: String(item.rationale ?? ""),
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

export default handler;
