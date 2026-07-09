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
  meetingId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().min(1).max(50000),
});

const outputSchema = {
  type: "object",
  properties: {
    todos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          dueDate: { type: ["string", "null"] },
        },
        required: ["title", "rationale", "dueDate"],
        additionalProperties: false,
      },
    },
  },
  required: ["todos"],
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

    const rateLimited = requireAiRateLimit(userId!, "extract-todos");
    if (rateLimited) {
      return rateLimited;
    }

    const { organizationId, meetingId, notes } = parsed.data;

    const hasAccess = await verifyOrgAccess(ctx.supabase, organizationId, userId);
    if (!hasAccess) {
      return jsonResponse({ error: "access_denied", success: false }, 403);
    }

    const aiResult = await callOpenAI(
      "Extract actionable todos from EOS meeting notes. Each todo needs a clear title and rationale.",
      notes,
      "extracted_todos",
      outputSchema,
    );

    if ("error" in aiResult) {
      return jsonResponse({ error: aiResult.error, success: false }, 503);
    }

    const todos = Array.isArray(aiResult.data.todos) ? aiResult.data.todos : [];

    const aiRunId = await logAiRun(ctx.supabase, {
      organizationId,
      actorId: userId,
      functionName: "extract-todos",
      inputSummary: meetingId ? `meeting:${meetingId}` : "notes",
      outputSummary: `${todos.length} todos`,
      status: "completed",
    });

    if (!aiRunId) {
      return jsonResponse({ error: "ai_run_failed", success: false }, 500);
    }

    const suggestionRows = todos.map((item: Record<string, unknown>) => ({
      suggestion_type: "todo",
      payload: {
        title: String(item.title ?? ""),
        rationale: String(item.rationale ?? ""),
        dueDate: item.dueDate ? String(item.dueDate) : null,
        sourceMeetingId: meetingId ?? null,
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
