import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "https://esm.sh/zod@3.24.2";
import {
  authenticateRequest,
  callOpenAI,
  corsHeaders,
  jsonResponse,
  logAiRun,
  persistSuggestions,
  verifyOrgAccess,
} from "./lib.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

  const auth = await authenticateRequest(req);
  if ("error" in auth && auth.error) {
    return auth.error;
  }

  const { user, userClient } = auth as Exclude<typeof auth, { error: Response }>;
  const { organizationId, meetingId, notes } = parsed.data;

  const hasAccess = await verifyOrgAccess(userClient, organizationId, user.id);
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

  const aiRunId = await logAiRun(userClient, {
    organizationId,
    actorId: user.id,
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
    userClient,
    organizationId,
    aiRunId,
    suggestionRows,
  );

  return jsonResponse({
    success: true,
    aiRunId,
    suggestions,
  });
});
