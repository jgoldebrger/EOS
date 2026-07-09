import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

export async function verifyOrgAccess(
  userClient: SupabaseClient,
  organizationId: string,
  userId: string,
) {
  const { data: membership } = await userClient
    .from("organization_members")
    .select("org_role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership || membership.org_role === "viewer") {
    return false;
  }

  return true;
}

export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  schemaName: string,
  jsonSchema: Record<string, unknown>,
) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return { error: "openai_not_configured" as const };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    return { error: "openai_request_failed" as const };
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    return { error: "openai_invalid_response" as const };
  }

  try {
    return { data: JSON.parse(content) as Record<string, unknown> };
  } catch {
    return { error: "openai_invalid_json" as const };
  }
}

export async function logAiRun(
  userClient: SupabaseClient,
  params: {
    organizationId: string;
    actorId: string;
    functionName: string;
    inputSummary: string;
    outputSummary: string;
    status: string;
  },
) {
  const { data, error } = await userClient
    .from("ai_runs")
    .insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      function_name: params.functionName,
      input_summary: params.inputSummary,
      output_summary: params.outputSummary,
      status: params.status,
    })
    .select("id")
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function persistSuggestions(
  userClient: SupabaseClient,
  organizationId: string,
  aiRunId: string,
  suggestions: Array<{ suggestion_type: string; payload: Record<string, unknown> }>,
) {
  if (suggestions.length === 0) {
    return [];
  }

  const rows = suggestions.map((item) => ({
    organization_id: organizationId,
    ai_run_id: aiRunId,
    suggestion_type: item.suggestion_type,
    payload: item.payload,
    status: "pending",
  }));

  const { data, error } = await userClient
    .from("ai_suggestions")
    .insert(rows)
    .select("*");

  if (error || !data) {
    return [];
  }

  return data;
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return req.headers.get("x-real-ip") ?? "unknown";
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkEdgeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function requireAiRateLimit(
  userId: string,
  functionName: string,
  limit = 30,
  windowMs = 60 * 60 * 1000,
): Response | null {
  const allowed = checkEdgeRateLimit(
    `ai:${functionName}:${userId}`,
    limit,
    windowMs,
  );
  if (!allowed) {
    return jsonResponse({ error: "rate_limited", success: false }, 429);
  }
  return null;
}

export function requireUserId(userId: string | undefined | null) {
  if (!userId) {
    return jsonResponse({ error: "unauthorized", success: false }, 401);
  }
  return null;
}
