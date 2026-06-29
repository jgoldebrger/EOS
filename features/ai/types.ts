import type { AiSuggestion, SuggestionType } from "@/features/ai/schema";

export type AiFunctionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface AiRunWithSuggestions {
  aiRunId: string;
  suggestions: AiSuggestion[];
}

export interface SummarizeMeetingResult {
  aiRunId: string;
  summary: string;
  suggestions: AiSuggestion[];
}

export interface AnalyzeScorecardResult {
  aiRunId: string;
  suggestions: AiSuggestion[];
}

export interface ExtractTodosResult {
  aiRunId: string;
  suggestions: AiSuggestion[];
}

export interface DedupeIssuesResult {
  aiRunId: string;
  suggestions: AiSuggestion[];
}

export type AiSuggestionActionResult =
  | { success: true; suggestionId: string }
  | { success: false; error: string };

export interface PendingSuggestionsFilter {
  organizationId: string;
  suggestionTypes?: SuggestionType[];
  meetingId?: string;
}
