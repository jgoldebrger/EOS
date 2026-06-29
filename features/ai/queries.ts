import { createClient } from "@/lib/supabase/server";
import {
  aiSuggestionSchema,
  type AiSuggestion,
  type SuggestionType,
} from "@/features/ai/schema";
import type { PendingSuggestionsFilter } from "@/features/ai/types";

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

export async function getPendingSuggestions(
  filter: PendingSuggestionsFilter,
): Promise<AiSuggestion[]> {
  const supabase = await createClient();

  let query = supabase
    .from("ai_suggestions")
    .select("*")
    .eq("organization_id", filter.organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (filter.suggestionTypes?.length) {
    query = query.in("suggestion_type", filter.suggestionTypes);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const suggestions = data
    .map(mapSuggestionRow)
    .filter((item): item is AiSuggestion => item !== null);

  if (!filter.meetingId) {
    return suggestions;
  }

  return suggestions.filter((suggestion) => {
    const payload = suggestion.payload as { meetingId?: string };
    return payload.meetingId === filter.meetingId;
  });
}

export async function getSuggestionById(
  organizationId: string,
  suggestionId: string,
): Promise<AiSuggestion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", suggestionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapSuggestionRow(data);
}

export async function listSuggestionsByTypes(
  organizationId: string,
  types: SuggestionType[],
): Promise<AiSuggestion[]> {
  return getPendingSuggestions({ organizationId, suggestionTypes: types });
}
