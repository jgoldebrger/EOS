"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiApprovalPanel } from "@/components/ai/ai-approval-panel";
import { analyzeScorecard } from "@/features/ai/functions";
import type { AiSuggestion } from "@/features/ai/schema";
import type { ScorecardMetricWithOwner, ScorecardValueCell } from "@/features/scorecard/types";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";

interface ScorecardAnalyzeButtonProps {
  organizationId: string;
  metrics: ScorecardMetricWithOwner[];
  weeks: string[];
  valuesByMetric: Record<string, ScorecardValueCell[]>;
  initialSuggestions?: AiSuggestion[];
}

export function ScorecardAnalyzeButton({
  organizationId,
  metrics,
  weeks,
  valuesByMetric,
  initialSuggestions = [],
}: ScorecardAnalyzeButtonProps) {
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [showPanel, setShowPanel] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    if (metrics.length === 0) {
      showErrorToast("Add scorecard metrics before analyzing trends.");
      return;
    }

    startTransition(async () => {
      const payload = {
        organizationId,
        metrics: metrics.map((metric) => ({
          metricId: metric.id,
          name: metric.name,
          targetRule: metric.target_rule ?? metric.target_operator ?? "exact",
          weeks: (valuesByMetric[metric.id] ?? weeks.map((periodStart) => ({
            periodStart,
            actual: null,
            target: null,
            status: "na",
          }))).map((week) => ({
            periodStart: week.periodStart,
            actual: week.actual,
            target: week.targetSnapshot,
            status: week.status,
          })),
        })),
      };

      const result = await analyzeScorecard(payload);

      if (!result.success) {
        showErrorToast(result.error);
        return;
      }

      setSuggestions((current) => [...result.data.suggestions, ...current]);
      setShowPanel(true);
      showSuccessToast("Scorecard insights ready for review");
    });
  }

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={handleAnalyze}
        disabled={isPending}
        data-testid="ai-analyze-scorecard-button"
      >
        <Sparkles className="mr-2 size-4" />
        {isPending ? "Analyzing…" : "Analyze trends"}
      </Button>

      {showPanel && suggestions.length > 0 ? (
        <AiApprovalPanel
          suggestions={suggestions.filter((item) => item.status === "pending")}
          title="Scorecard insights"
        />
      ) : null}
    </div>
  );
}
