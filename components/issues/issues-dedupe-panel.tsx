"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { dedupeIssues } from "@/features/ai/functions";
import type { AiSuggestion } from "@/features/ai/schema";
import type { IssueWithLinks } from "@/features/issues/types";
import { AiApprovalPanel } from "@/components/ai/ai-approval-panel";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";

interface IssuesDedupePanelProps {
  organizationId: string;
  issues: IssueWithLinks[];
  canUseAi: boolean;
}

export function IssuesDedupePanel({
  organizationId,
  issues,
  canUseAi,
}: IssuesDedupePanelProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isPending, startTransition] = useTransition();

  if (!canUseAi || issues.length < 2) {
    return null;
  }

  function handleDedupe() {
    startTransition(async () => {
      const result = await dedupeIssues({
        organizationId,
        issues: issues.map((issue) => ({
          issueId: issue.id,
          title: issue.title,
        })),
      });

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      setSuggestions((current) => [...result.data.suggestions, ...current]);
      showSuccessToast("Duplicate issue suggestions ready");
    });
  }

  return (
    <div className="space-y-4" data-testid="issues-dedupe-panel">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleDedupe}
        disabled={isPending}
      >
        <Sparkles className="mr-2 h-4 w-4" aria-hidden />
        {isPending ? "Analyzing…" : "Find duplicates"}
      </Button>
      {suggestions.length > 0 ? (
        <AiApprovalPanel
          suggestions={suggestions.filter((item) => item.status === "pending")}
          title="Duplicate issue suggestions"
        />
      ) : null}
    </div>
  );
}
