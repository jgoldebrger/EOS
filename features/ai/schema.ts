import { z } from "zod";

export const suggestionTypeSchema = z.enum([
  "todo",
  "issue_merge",
  "meeting_summary",
  "scorecard_insight",
  "agenda_focus",
]);

export const suggestionStatusSchema = z.enum([
  "pending",
  "approved",
  "dismissed",
]);

export const todoSuggestionPayloadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  rationale: z.string().trim().max(1000),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  ownerId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
  sourceMeetingId: z.string().uuid().nullable().optional(),
});

export const issueMergeSuggestionPayloadSchema = z.object({
  primaryIssueId: z.string().uuid(),
  mergeIssueIds: z.array(z.string().uuid()).min(1),
  mergedTitle: z.string().trim().min(1).max(200),
  rationale: z.string().trim().max(1000),
});

export const meetingSummaryPayloadSchema = z.object({
  meetingId: z.string().uuid(),
  summary: z.string().trim().min(1).max(8000),
  keyDecisions: z.array(z.string().trim().max(500)).default([]),
  actionItems: z.array(z.string().trim().max(500)).default([]),
});

export const agendaFocusPayloadSchema = z.object({
  meetingId: z.string().uuid(),
  sectionKey: z.string().trim().min(1).max(100),
  focusPoints: z.array(z.string().trim().max(500)).min(1),
  rationale: z.string().trim().max(1000),
});

export const scorecardInsightPayloadSchema = z.object({
  metricId: z.string().uuid().nullable().optional(),
  metricName: z.string().trim().min(1).max(200),
  insight: z.string().trim().min(1).max(2000),
  trend: z.enum(["improving", "declining", "stable", "volatile"]),
  severity: z.enum(["info", "warning", "critical"]),
});

export const suggestionPayloadSchema = z.union([
  todoSuggestionPayloadSchema,
  issueMergeSuggestionPayloadSchema,
  meetingSummaryPayloadSchema,
  agendaFocusPayloadSchema,
  scorecardInsightPayloadSchema,
]);

export const aiSuggestionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  aiRunId: z.string().uuid(),
  suggestionType: suggestionTypeSchema,
  payload: suggestionPayloadSchema,
  status: suggestionStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().uuid().nullable(),
});

export const summarizeMeetingInputSchema = z.object({
  organizationId: z.string().uuid(),
  meetingId: z.string().uuid(),
  notes: z.string().trim().min(1).max(50000),
});

export const analyzeScorecardInputSchema = z.object({
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

export const extractTodosInputSchema = z.object({
  organizationId: z.string().uuid(),
  meetingId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().min(1).max(50000),
});

export const dedupeIssuesInputSchema = z.object({
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

export const approveSuggestionSchema = z.object({
  organizationId: z.string().uuid(),
  suggestionId: z.string().uuid(),
  payload: suggestionPayloadSchema.optional(),
});

export const dismissSuggestionSchema = z.object({
  organizationId: z.string().uuid(),
  suggestionId: z.string().uuid(),
});

export type SuggestionType = z.infer<typeof suggestionTypeSchema>;
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;
export type TodoSuggestionPayload = z.infer<typeof todoSuggestionPayloadSchema>;
export type IssueMergeSuggestionPayload = z.infer<
  typeof issueMergeSuggestionPayloadSchema
>;
export type MeetingSummaryPayload = z.infer<typeof meetingSummaryPayloadSchema>;
export type AgendaFocusPayload = z.infer<typeof agendaFocusPayloadSchema>;
export type ScorecardInsightPayload = z.infer<
  typeof scorecardInsightPayloadSchema
>;
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
