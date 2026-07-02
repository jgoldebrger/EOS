"use client";

import { createClient } from "@/lib/supabase/client";
import {
  analyzeScorecardInputSchema,
  dedupeIssuesInputSchema,
  extractTodosInputSchema,
  summarizeMeetingInputSchema,
  type AiSuggestion,
  aiSuggestionSchema,
} from "@/features/ai/schema";
import type {
  AiFunctionResult,
  AnalyzeScorecardResult,
  DedupeIssuesResult,
  ExtractTodosResult,
  SummarizeMeetingResult,
} from "@/features/ai/types";

function mapSuggestionRow(row: {
  id: string;
  organization_id: string;
  ai_run_id: string;
  suggestion_type: string;
  payload: unknown;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}): AiSuggestion | null {
  const parsed = aiSuggestionSchema.safeParse({
    id: row.id,
    organizationId: row.organization_id,
    aiRunId: row.ai_run_id,
    suggestionType: row.suggestion_type,
    payload: row.payload,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  });

  return parsed.success ? parsed.data : null;
}

function mapAiFunctionError(code: string): string {
  switch (code) {
    case "openai_not_configured":
      return "OpenAI is not configured. Add OPENAI_API_KEY in Supabase → Edge Functions → Secrets.";
    case "openai_request_failed":
      return "OpenAI request failed. Check your API key and billing.";
    case "access_denied":
      return "You do not have permission to run this AI action.";
    case "invalid_input":
      return "Invalid input for the AI request.";
    case "ai_run_failed":
      return "Could not save the AI run. Try again.";
    case "unauthorized":
      return "Sign in again to use AI features.";
    default:
      return code;
  }
}

async function readFunctionErrorBody(error: unknown): Promise<string | null> {
  if (
    typeof error === "object" &&
    error !== null &&
    "context" in error &&
    typeof (error as { context?: Response }).context?.json === "function"
  ) {
    try {
      const body = (await (error as { context: Response }).context.json()) as {
        error?: unknown;
      };
      if (typeof body.error === "string") {
        return mapAiFunctionError(body.error);
      }
    } catch {
      return null;
    }
  }
  return null;
}

async function invokeAiFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<AiFunctionResult<T>> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });

  if (error) {
    const detail = await readFunctionErrorBody(error);
    return {
      success: false,
      error: detail ?? error.message ?? "AI request failed",
    };
  }

  if (!data || typeof data !== "object") {
    return { success: false, error: "Invalid response from AI service" };
  }

  const payload = data as Record<string, unknown>;
  if (payload.error) {
    return {
      success: false,
      error:
        typeof payload.error === "string"
          ? payload.error
          : "AI request failed",
    };
  }

  return { success: true, data: payload as T };
}

export async function summarizeMeeting(
  input: unknown,
): Promise<AiFunctionResult<SummarizeMeetingResult>> {
  const parsed = summarizeMeetingInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid meeting input",
    };
  }

  const result = await invokeAiFunction<{
    aiRunId: string;
    summary: string;
    suggestions: unknown[];
  }>("summarize-meeting", parsed.data);

  if (!result.success) {
    return result;
  }

  const suggestions = (result.data.suggestions ?? [])
    .map((row) =>
      mapSuggestionRow(
        row as Parameters<typeof mapSuggestionRow>[0],
      ),
    )
    .filter((item): item is AiSuggestion => item !== null);

  return {
    success: true,
    data: {
      aiRunId: result.data.aiRunId,
      summary: result.data.summary,
      suggestions,
    },
  };
}

export async function analyzeScorecard(
  input: unknown,
): Promise<AiFunctionResult<AnalyzeScorecardResult>> {
  const parsed = analyzeScorecardInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid scorecard input",
    };
  }

  const result = await invokeAiFunction<{
    aiRunId: string;
    suggestions: unknown[];
  }>("analyze-scorecard", parsed.data);

  if (!result.success) {
    return result;
  }

  const suggestions = (result.data.suggestions ?? [])
    .map((row) =>
      mapSuggestionRow(
        row as Parameters<typeof mapSuggestionRow>[0],
      ),
    )
    .filter((item): item is AiSuggestion => item !== null);

  return {
    success: true,
    data: {
      aiRunId: result.data.aiRunId,
      suggestions,
    },
  };
}

export async function extractTodos(
  input: unknown,
): Promise<AiFunctionResult<ExtractTodosResult>> {
  const parsed = extractTodosInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid notes input",
    };
  }

  const result = await invokeAiFunction<{
    aiRunId: string;
    suggestions: unknown[];
  }>("extract-todos", parsed.data);

  if (!result.success) {
    return result;
  }

  const suggestions = (result.data.suggestions ?? [])
    .map((row) =>
      mapSuggestionRow(
        row as Parameters<typeof mapSuggestionRow>[0],
      ),
    )
    .filter((item): item is AiSuggestion => item !== null);

  return {
    success: true,
    data: {
      aiRunId: result.data.aiRunId,
      suggestions,
    },
  };
}

export async function dedupeIssues(
  input: unknown,
): Promise<AiFunctionResult<DedupeIssuesResult>> {
  const parsed = dedupeIssuesInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid issues input",
    };
  }

  const result = await invokeAiFunction<{
    aiRunId: string;
    suggestions: unknown[];
  }>("dedupe-issues", parsed.data);

  if (!result.success) {
    return result;
  }

  const suggestions = (result.data.suggestions ?? [])
    .map((row) =>
      mapSuggestionRow(
        row as Parameters<typeof mapSuggestionRow>[0],
      ),
    )
    .filter((item): item is AiSuggestion => item !== null);

  return {
    success: true,
    data: {
      aiRunId: result.data.aiRunId,
      suggestions,
    },
  };
}
