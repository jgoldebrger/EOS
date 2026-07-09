import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "https://esm.sh/zod@3.24.2";
import {
  callOpenAI,
  jsonResponse,
  logAiRun,
  persistSuggestions,
  requireAiRateLimit,
  requireUserId,
  verifyOrgAccess,
} from "../_shared/edge-utils.ts";

const inputSchema = z.object({
  organizationId: z.string().uuid(),
  meetingId: z.string().uuid(),
  notes: z.string().trim().min(1).max(50000),
});

const outputSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    agendaFocus: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sectionKey: { type: "string" },
          focusPoints: {
            type: "array",
            items: { type: "string" },
          },
          rationale: { type: "string" },
        },
        required: ["sectionKey", "focusPoints", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "agendaFocus"],
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

    const rateLimited = requireAiRateLimit(userId!, "summarize-meeting");
    if (rateLimited) {
      return rateLimited;
    }

    const { organizationId, meetingId, notes } = parsed.data;

    const hasAccess = await verifyOrgAccess(ctx.supabase, organizationId, userId);
    if (!hasAccess) {
      return jsonResponse({ error: "access_denied", success: false }, 403);
    }

    const aiResult = await callOpenAI(
      "You summarize EOS L10 meeting notes. Return concise executive summary and agenda focus suggestions.",
      `Meeting ID: ${meetingId}\n\nNotes:\n${notes}`,
      "meeting_summary",
      outputSchema,
    );

    if ("error" in aiResult) {
      return jsonResponse({ error: aiResult.error, success: false }, 503);
    }

    const summary = String(aiResult.data.summary ?? "");
    const agendaFocus = Array.isArray(aiResult.data.agendaFocus)
      ? aiResult.data.agendaFocus
      : [];

    const aiRunId = await logAiRun(ctx.supabase, {
      organizationId,
      actorId: userId,
      functionName: "summarize-meeting",
      inputSummary: `meeting:${meetingId}`,
      outputSummary: summary.slice(0, 500),
      status: "completed",
    });

    if (!aiRunId) {
      return jsonResponse({ error: "ai_run_failed", success: false }, 500);
    }

    const suggestionRows = [
      {
        suggestion_type: "meeting_summary",
        payload: {
          meetingId,
          summary,
          keyDecisions: [],
          actionItems: [],
        },
      },
      ...agendaFocus.map((item: Record<string, unknown>) => ({
        suggestion_type: "agenda_focus",
        payload: {
          meetingId,
          sectionKey: String(item.sectionKey ?? "issues"),
          focusPoints: Array.isArray(item.focusPoints)
            ? item.focusPoints.map(String)
            : [],
          rationale: String(item.rationale ?? ""),
        },
      })),
    ];

    const suggestions = await persistSuggestions(
      ctx.supabase,
      organizationId,
      aiRunId,
      suggestionRows,
    );

    return jsonResponse({
      success: true,
      aiRunId,
      summary,
      suggestions,
    });
  }),
};

export default handler;
