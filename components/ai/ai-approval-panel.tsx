"use client";

import { useState } from "react";
import type { AiSuggestion } from "@/features/ai/schema";
import { AiSuggestionCard } from "@/components/ai/ai-suggestion-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AiApprovalPanelProps {
  suggestions: AiSuggestion[];
  title?: string;
  emptyMessage?: string;
}

export function AiApprovalPanel({
  suggestions: initialSuggestions,
  title = "AI suggestions",
  emptyMessage = "No pending suggestions.",
}: AiApprovalPanelProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);

  function handleResolved(suggestionId: string) {
    setSuggestions((current) => current.filter((item) => item.id !== suggestionId));
  }

  if (suggestions.length === 0) {
    return (
      <Card data-testid="ai-approval-panel-empty">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="ai-approval-panel">
      <h3 className="text-lg font-medium">{title}</h3>
      {suggestions.map((suggestion) => (
        <AiSuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onResolved={handleResolved}
        />
      ))}
    </div>
  );
}
