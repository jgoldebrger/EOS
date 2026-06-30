"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertValue } from "@/features/scorecard/actions";
import {
  formatMetricValue,
  getDatesInWeek,
  getTimeKind,
  metricValueToInput,
  parseMetricInputValue,
  ROLLUP_METHOD_LABELS,
  type TimeKind,
  type ValueType,
} from "@/features/scorecard/utils";
import type { ScorecardMetricWithOwner, ScorecardValueCell } from "@/features/scorecard/types";
import { TimeValueInput } from "@/components/scorecard/time-value-input";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DailyValuesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  metric: ScorecardMetricWithOwner;
  cell: ScorecardValueCell;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function buildTextDrafts(
  cell: ScorecardValueCell,
  valueType: ValueType,
  timeKind: TimeKind,
): Record<string, string> {
  const drafts: Record<string, string> = {};
  for (const date of getDatesInWeek(cell.periodStart)) {
    const existing = cell.dailyValues?.find((entry) => entry.date === date);
    drafts[date] = metricValueToInput(existing?.actual ?? null, valueType, timeKind);
  }
  return drafts;
}

function buildTimeDrafts(cell: ScorecardValueCell): Record<string, number | null> {
  const drafts: Record<string, number | null> = {};
  for (const date of getDatesInWeek(cell.periodStart)) {
    const existing = cell.dailyValues?.find((entry) => entry.date === date);
    drafts[date] = existing?.actual ?? null;
  }
  return drafts;
}

interface DailyValuesFormProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  metric: ScorecardMetricWithOwner;
  cell: ScorecardValueCell;
  onClose: () => void;
}

function DailyValuesForm({
  organizationId,
  orgSlug,
  teamSlug,
  metric,
  cell,
  onClose,
}: DailyValuesFormProps) {
  const router = useRouter();
  const valueType = (metric.value_type ?? "number") as ValueType;
  const timeKind = getTimeKind(metric);
  const isTime = valueType === "time";
  const weekDates = useMemo(
    () => getDatesInWeek(cell.periodStart),
    [cell.periodStart],
  );
  const [drafts, setDrafts] = useState(() =>
    isTime ? {} : buildTextDrafts(cell, valueType, timeKind),
  );
  const [timeDrafts, setTimeDrafts] = useState(() =>
    isTime ? buildTimeDrafts(cell) : {},
  );
  const [isPending, startTransition] = useTransition();

  const rollupLabel = cell.rollupMethod
    ? ROLLUP_METHOD_LABELS[cell.rollupMethod]
    : "Rollup";

  function saveAll() {
    startTransition(async () => {
      let hadError = false;

      for (const date of weekDates) {
        const existing = cell.dailyValues?.find((entry) => entry.date === date);
        const parsed = isTime
          ? (timeDrafts[date] ?? null)
          : parseMetricInputValue(drafts[date] ?? "", valueType, timeKind);

        if (!isTime && (drafts[date] ?? "").trim() !== "" && Number.isNaN(parsed)) {
          showErrorToast("Invalid value", `Enter a valid value for ${formatDayLabel(date)}.`);
          hadError = true;
          break;
        }

        const previous = existing?.actual ?? null;
        if (parsed === previous) {
          continue;
        }

        const result = await upsertValue({
          organizationId,
          orgSlug,
          teamSlug,
          metricId: metric.id,
          periodStart: date,
          periodType: "daily",
          actual: parsed,
        });

        if (!result.success) {
          showErrorToast("Could not save value", result.error);
          hadError = true;
          break;
        }
      }

      if (!hadError) {
        showSuccessToast("Daily values saved");
        router.refresh();
        onClose();
      }
    });
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{metric.name}</SheetTitle>
        <SheetDescription>
          Week of {formatDayLabel(cell.periodStart)} — enter daily values. Weekly L10 column uses{" "}
          {rollupLabel.toLowerCase()}
          {cell.filledDayCount != null ? ` (${cell.filledDayCount} days entered)` : ""}.
        </SheetDescription>
      </SheetHeader>

      <div className="mt-6 space-y-3">
        {weekDates.map((date) => (
          <div key={date} className="flex items-center gap-3">
            <label className="w-28 shrink-0 text-sm text-muted-foreground" htmlFor={date}>
              {formatDayLabel(date)}
            </label>
            {isTime ? (
              <TimeValueInput
                id={date}
                timeKind={timeKind}
                className="h-9"
                value={timeDrafts[date] ?? null}
                onChange={(minutes) =>
                  setTimeDrafts((current) => ({ ...current, [date]: minutes }))
                }
                onInvalid={() =>
                  showErrorToast(
                    "Invalid time",
                    timeKind === "clock"
                      ? "Use a time like 2 or 2:00 PM."
                      : "Use hours:minutes (e.g. 1:30).",
                  )
                }
              />
            ) : (
              <Input
                id={date}
                type="number"
                inputMode="decimal"
                className="h-9"
                value={drafts[date] ?? ""}
                placeholder="—"
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [date]: event.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      {cell.actual !== null && (
        <p className="mt-4 text-sm text-muted-foreground">
          Weekly {rollupLabel.toLowerCase()}:{" "}
          <span className="font-medium text-foreground">
            {formatMetricValue(cell.actual, valueType, timeKind)}
          </span>
        </p>
      )}

      <SheetFooter className="mt-6">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={saveAll} disabled={isPending}>
          {isPending ? "Saving…" : "Save daily values"}
        </Button>
      </SheetFooter>
    </>
  );
}

export function DailyValuesSheet({
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  teamSlug,
  metric,
  cell,
}: DailyValuesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        {open ? (
          <DailyValuesForm
            key={`${metric.id}-${cell.periodStart}`}
            organizationId={organizationId}
            orgSlug={orgSlug}
            teamSlug={teamSlug}
            metric={metric}
            cell={cell}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
