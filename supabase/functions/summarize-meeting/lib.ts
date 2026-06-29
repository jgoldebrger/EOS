import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "unauthorized", success: false }, 401) };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    return {
      error: jsonResponse({ error: "configuration_error", success: false }, 500),
    };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return { error: jsonResponse({ error: "unauthorized", success: false }, 401) };
  }

  return { user, userClient, authHeader };
}

export async function verifyOrgAccess(
  userClient: ReturnType<typeof createClient>,
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
  userClient: ReturnType<typeof createClient>,
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
  userClient: ReturnType<typeof createClient>,
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
