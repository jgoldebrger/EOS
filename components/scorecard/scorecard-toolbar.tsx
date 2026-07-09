"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Bookmark } from "lucide-react";
import { toast } from "sonner";
import type { PeriodType } from "@/features/scorecard/utils";
import type { ScorecardCategory } from "@/features/scorecard/types";
import { toggleScorecardBookmark } from "@/features/scorecard/saved-views";
import { CreateCategoryDialog } from "@/components/scorecard/create-category-dialog";
import { CreateTagDialog } from "@/components/scorecard/create-tag-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { exportScorecardCsv } from "@/features/scorecard/actions";

const PERIOD_TABS: { value: PeriodType; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs";

interface ScorecardToolbarProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  teamId?: string;
  categories: ScorecardCategory[];
  canManageMetrics?: boolean;
}

export function ScorecardToolbar({
  organizationId,
  orgSlug,
  teamSlug,
  teamId,
  categories,
  canManageMetrics = false,
}: ScorecardToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookmarkPending, startBookmarkTransition] = useTransition();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const periodType = (searchParams.get("period") ?? "weekly") as PeriodType;
  const groupBy = searchParams.get("groupBy") ?? "owner";
  const state = searchParams.get("state") ?? "active";
  const categoryId = searchParams.get("category") ?? "all";
  const range = searchParams.get("range") ?? "13";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else if (key === "category" || key === "q") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(
      `/org/${orgSlug}/teams/${teamSlug}/scorecard?${params.toString()}`,
    );
  }

  async function handleExport() {
    const result = await exportScorecardCsv({
      orgSlug,
      teamSlug,
      periodType,
      range: Number(range),
    });
    if (result.success && result.csv) {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scorecard-${teamSlug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  function handleBookmark() {
    startBookmarkTransition(async () => {
      const result = await toggleScorecardBookmark({
        organizationId,
        orgSlug,
        teamSlug,
        teamId,
        filters: {
          period: periodType,
          groupBy,
          state,
          category: categoryId,
          range,
          q: searchParams.get("q") ?? "",
        },
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setIsBookmarked(result.bookmarked);
      toast.success(
        result.bookmarked ? "Scorecard view bookmarked" : "Bookmark removed",
      );
    });
  }

  return (
    <div className="space-y-4" data-testid="scorecard-toolbar">
      <div className="flex flex-wrap gap-1 border-b">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => updateParam("period", tab.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              periodType === tab.value
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search scorecards by name"
          className="max-w-xs"
          defaultValue={searchParams.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("q", e.currentTarget.value);
            }
          }}
          aria-label="Search scorecards by name"
        />

        <select
          className={selectClass}
          value={range}
          onChange={(e) => updateParam("range", e.target.value)}
          aria-label="Date range"
        >
          <option value="13">Last 13 weeks</option>
          <option value="26">Last 26 weeks</option>
          <option value="52">Last 52 weeks</option>
        </select>

        <select
          className={selectClass}
          value={state}
          onChange={(e) => updateParam("state", e.target.value)}
          aria-label="State filter"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>

        <select
          className={selectClass}
          value={categoryId}
          onChange={(e) => updateParam("category", e.target.value)}
          aria-label="Category filter"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {canManageMetrics ? (
          <>
            <CreateCategoryDialog
              organizationId={organizationId}
              orgSlug={orgSlug}
              teamId={teamId}
              teamSlug={teamSlug}
            />
            <CreateTagDialog
              organizationId={organizationId}
              orgSlug={orgSlug}
              teamId={teamId}
              teamSlug={teamSlug}
            />
          </>
        ) : null}

        <select
          className={selectClass}
          value={groupBy}
          onChange={(e) => updateParam("groupBy", e.target.value)}
          aria-label="Group by"
        >
          <option value="owner">Group by Owner</option>
          <option value="team">Group by Team</option>
          <option value="none">No grouping</option>
        </select>

        <span className="text-sm text-muted-foreground">View as Table</span>

        <div className="ml-auto flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark view"}
            aria-pressed={isBookmarked}
            disabled={bookmarkPending}
            onClick={handleBookmark}
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
          </Button>
          <Button variant="outline" size="icon" aria-label="Download CSV" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
