import { describe, expect, it } from "vitest";
import {
  agendaFocusPayloadSchema,
  aiSuggestionSchema,
  analyzeScorecardInputSchema,
  approveSuggestionSchema,
  dedupeIssuesInputSchema,
  dismissSuggestionSchema,
  extractTodosInputSchema,
  issueMergeSuggestionPayloadSchema,
  meetingSummaryPayloadSchema,
  scorecardInsightPayloadSchema,
  suggestionTypeSchema,
  summarizeMeetingInputSchema,
  todoSuggestionPayloadSchema,
} from "@/features/ai/schema";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const meetingId = "550e8400-e29b-41d4-a716-446655440010";
const suggestionId = "550e8400-e29b-41d4-a716-446655440020";
const aiRunId = "550e8400-e29b-41d4-a716-446655440021";
const issueId = "550e8400-e29b-41d4-a716-446655440030";
const metricId = "550e8400-e29b-41d4-a716-446655440040";

describe("suggestionTypeSchema", () => {
  it("accepts known suggestion types", () => {
    expect(suggestionTypeSchema.parse("todo")).toBe("todo");
    expect(suggestionTypeSchema.parse("issue_merge")).toBe("issue_merge");
    expect(suggestionTypeSchema.parse("meeting_summary")).toBe("meeting_summary");
  });

  it("rejects unknown suggestion types", () => {
    expect(suggestionTypeSchema.safeParse("auto_apply").success).toBe(false);
  });
});

describe("todoSuggestionPayloadSchema", () => {
  it("validates todo suggestion payloads", () => {
    const payload = todoSuggestionPayloadSchema.parse({
      title: "Follow up with sales",
      rationale: "Raised during IDS",
      dueDate: "2026-07-01",
      sourceMeetingId: meetingId,
    });

    expect(payload.title).toBe("Follow up with sales");
  });
});

describe("issueMergeSuggestionPayloadSchema", () => {
  it("requires at least one merge target", () => {
    const result = issueMergeSuggestionPayloadSchema.safeParse({
      primaryIssueId: issueId,
      mergeIssueIds: [],
      mergedTitle: "Combined issue",
      rationale: "Duplicates",
    });

    expect(result.success).toBe(false);
  });
});

describe("meetingSummaryPayloadSchema", () => {
  it("validates meeting summary payloads", () => {
    const payload = meetingSummaryPayloadSchema.parse({
      meetingId,
      summary: "Team reviewed scorecard and prioritized three issues.",
      keyDecisions: ["Hire two reps"],
      actionItems: ["Update pipeline report"],
    });

    expect(payload.summary).toContain("scorecard");
  });
});

describe("agendaFocusPayloadSchema", () => {
  it("requires focus points", () => {
    const result = agendaFocusPayloadSchema.safeParse({
      meetingId,
      sectionKey: "issues",
      focusPoints: [],
      rationale: "No focus",
    });

    expect(result.success).toBe(false);
  });
});

describe("scorecardInsightPayloadSchema", () => {
  it("validates scorecard insight payloads", () => {
    const payload = scorecardInsightPayloadSchema.parse({
      metricId,
      metricName: "Weekly revenue",
      insight: "Revenue declined for three consecutive weeks.",
      trend: "declining",
      severity: "warning",
    });

    expect(payload.trend).toBe("declining");
  });
});

describe("aiSuggestionSchema", () => {
  it("maps a persisted suggestion row shape", () => {
    const suggestion = aiSuggestionSchema.parse({
      id: suggestionId,
      organizationId: orgId,
      aiRunId,
      suggestionType: "todo",
      payload: {
        title: "Send recap",
        rationale: "Close the loop",
      },
      status: "pending",
      createdAt: "2026-06-29T12:00:00.000Z",
      resolvedAt: null,
      resolvedBy: null,
    });

    expect(suggestion.status).toBe("pending");
  });
});

describe("edge function input schemas", () => {
  it("validates summarize meeting input", () => {
    const parsed = summarizeMeetingInputSchema.parse({
      organizationId: orgId,
      meetingId,
      notes: "Discussed rocks and issues.",
    });

    expect(parsed.notes).toContain("issues");
  });

  it("validates analyze scorecard input", () => {
    const parsed = analyzeScorecardInputSchema.parse({
      organizationId: orgId,
      metrics: [
        {
          metricId,
          name: "Revenue",
          targetRule: "higher_is_better",
          weeks: [
            {
              periodStart: "2026-06-23",
              actual: 100,
              target: 120,
              status: "red",
            },
          ],
        },
      ],
    });

    expect(parsed.metrics).toHaveLength(1);
  });

  it("validates extract todos input", () => {
    const parsed = extractTodosInputSchema.parse({
      organizationId: orgId,
      meetingId,
      notes: "Action: update forecast.",
    });

    expect(parsed.meetingId).toBe(meetingId);
  });

  it("validates dedupe issues input", () => {
    const parsed = dedupeIssuesInputSchema.parse({
      organizationId: orgId,
      issues: [
        { issueId, title: "Hiring delay" },
        {
          issueId: "550e8400-e29b-41d4-a716-446655440031",
          title: "Open role backlog",
        },
      ],
    });

    expect(parsed.issues).toHaveLength(2);
  });
});

describe("approval action schemas", () => {
  it("validates approve and dismiss payloads", () => {
    expect(
      approveSuggestionSchema.parse({
        organizationId: orgId,
        suggestionId,
      }).suggestionId,
    ).toBe(suggestionId);

    expect(
      dismissSuggestionSchema.parse({
        organizationId: orgId,
        suggestionId,
      }).suggestionId,
    ).toBe(suggestionId);
  });
});
