"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { approveSuggestion, dismissSuggestion } from "@/features/ai/actions";
import {
  agendaFocusPayloadSchema,
  issueMergeSuggestionPayloadSchema,
  meetingSummaryPayloadSchema,
  scorecardInsightPayloadSchema,
  suggestionPayloadSchema,
  todoSuggestionPayloadSchema,
  type AiSuggestion,
} from "@/features/ai/schema";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface AiSuggestionCardProps {
  suggestion: AiSuggestion;
  onResolved?: (suggestionId: string) => void;
}

function getSuggestionTitle(suggestion: AiSuggestion): string {
  switch (suggestion.suggestionType) {
    case "todo":
      return todoSuggestionPayloadSchema.parse(suggestion.payload).title;
    case "issue_merge":
      return issueMergeSuggestionPayloadSchema.parse(suggestion.payload).mergedTitle;
    case "meeting_summary":
      return "Meeting summary";
    case "agenda_focus":
      return `Agenda focus: ${agendaFocusPayloadSchema.parse(suggestion.payload).sectionKey}`;
    case "scorecard_insight":
      return scorecardInsightPayloadSchema.parse(suggestion.payload).metricName;
    default:
      return "AI suggestion";
  }
}

function getSuggestionRationale(suggestion: AiSuggestion): string {
  const payload = suggestion.payload;

  switch (suggestion.suggestionType) {
    case "todo":
      return todoSuggestionPayloadSchema.parse(payload).rationale;
    case "issue_merge":
      return issueMergeSuggestionPayloadSchema.parse(payload).rationale;
    case "meeting_summary":
      return meetingSummaryPayloadSchema.parse(payload).summary;
    case "agenda_focus":
      return agendaFocusPayloadSchema.parse(payload).rationale;
    case "scorecard_insight":
      return scorecardInsightPayloadSchema.parse(payload).insight;
    default:
      return "";
  }
}

function canEditPayload(suggestion: AiSuggestion): boolean {
  return (
    suggestion.suggestionType === "todo" ||
    suggestion.suggestionType === "issue_merge"
  );
}

export function AiSuggestionCard({ suggestion, onResolved }: AiSuggestionCardProps) {
  const [editedTitle, setEditedTitle] = useState(() => getSuggestionTitle(suggestion));
  const [isPending, startTransition] = useTransition();

  const rationale = useMemo(
    () => getSuggestionRationale(suggestion),
    [suggestion],
  );

  function buildEditedPayload() {
    const base = suggestionPayloadSchema.parse(suggestion.payload);

    if (suggestion.suggestionType === "todo") {
      return { ...todoSuggestionPayloadSchema.parse(base), title: editedTitle };
    }

    if (suggestion.suggestionType === "issue_merge") {
      return {
        ...issueMergeSuggestionPayloadSchema.parse(base),
        mergedTitle: editedTitle,
      };
    }

    return base;
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await approveSuggestion({
        organizationId: suggestion.organizationId,
        suggestionId: suggestion.id,
        payload: canEditPayload(suggestion) ? buildEditedPayload() : undefined,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      showSuccessToast("Suggestion approved");
      onResolved?.(suggestion.id);
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissSuggestion({
        organizationId: suggestion.organizationId,
        suggestionId: suggestion.id,
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      onResolved?.(suggestion.id);
    });
  }

  return (
    <Card data-testid={`ai-suggestion-card-${suggestion.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{getSuggestionTitle(suggestion)}</CardTitle>
          <Badge variant="secondary">{suggestion.suggestionType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rationale}</p>
        {canEditPayload(suggestion) ? (
          <div className="space-y-2">
            <Label htmlFor={`edit-${suggestion.id}`}>Edit before approving</Label>
            <Input
              id={`edit-${suggestion.id}`}
              value={editedTitle}
              onChange={(event) => setEditedTitle(event.target.value)}
              disabled={isPending}
            />
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isPending}
          data-testid={`ai-suggestion-approve-${suggestion.id}`}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          disabled={isPending}
          data-testid={`ai-suggestion-dismiss-${suggestion.id}`}
        >
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
