"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiApprovalPanel } from "@/components/ai/ai-approval-panel";
import { extractTodos, summarizeMeeting } from "@/features/ai/functions";
import type { AiSuggestion } from "@/features/ai/schema";
import { meetingSummaryPayloadSchema } from "@/features/ai/schema";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface AiSummaryPanelProps {
  organizationId: string;
  meetingId: string;
  notes: string;
  canUseAi: boolean;
  initialSuggestions?: AiSuggestion[];
}

export function AiSummaryPanel({
  organizationId,
  meetingId,
  notes,
  canUseAi,
  initialSuggestions = [],
}: AiSummaryPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [isPending, startTransition] = useTransition();

  function handleSummarize() {
    if (!notes.trim()) {
      showErrorToast("Add meeting notes before requesting a summary.");
      return;
    }

    startTransition(async () => {
      const result = await summarizeMeeting({
        organizationId,
        meetingId,
        notes,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      setSummary(result.data.summary);
      setSuggestions((current) => [...result.data.suggestions, ...current]);
      showSuccessToast("Meeting summary generated");
    });
  }

  function handleExtractTodos() {
    if (!notes.trim()) {
      showErrorToast("Add meeting notes before extracting todos.");
      return;
    }

    startTransition(async () => {
      const result = await extractTodos({
        organizationId,
        meetingId,
        notes,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      setSuggestions((current) => [...result.data.suggestions, ...current]);
      showSuccessToast("Todo suggestions ready for review");
    });
  }

  const summarySuggestion = suggestions.find(
    (item) => item.suggestionType === "meeting_summary",
  );

  const displaySummary =
    summary ??
    (summarySuggestion
      ? meetingSummaryPayloadSchema.safeParse(summarySuggestion.payload).data
          ?.summary
      : null);

  return (
    <div className="space-y-4" data-testid="ai-summary-panel">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg">AI assistant</CardTitle>
          {canUseAi ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSummarize}
                disabled={isPending}
                data-testid="ai-summarize-meeting-button"
              >
                <Sparkles className="mr-2 size-4" />
                {isPending ? "Working…" : "Summarize"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExtractTodos}
                disabled={isPending}
                data-testid="ai-extract-todos-button"
              >
                Extract todos
              </Button>
            </div>
          ) : null}
        </CardHeader>
        {displaySummary ? (
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {displaySummary}
            </p>
          </CardContent>
        ) : null}
      </Card>

      <AiApprovalPanel
        suggestions={suggestions.filter((item) => item.status === "pending")}
        title="Review AI suggestions"
      />
    </div>
  );
}
