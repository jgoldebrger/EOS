"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileWarning } from "lucide-react";
import { upsertValue } from "@/features/scorecard/actions";
import {
  evaluateMetricForRow,
  formatMetricDisplayTarget,
  formatMetricValue,
  formatPeriodLabel,
  getTimeKind,
  metricValueToInput,
  parseMetricInputValue,
  ROLLUP_METHOD_LABELS,
  STATUS_CELL_CLASSES,
  type PeriodType,
  type ValueType,
} from "@/features/scorecard/utils";
import { TimeValueInput } from "@/components/scorecard/time-value-input";
import type {
  ScorecardCategory,
  ScorecardGridRow,
  ScorecardMemberOption,
  ScorecardMetricWithOwner,
  ScorecardTag,
  ScorecardTeamOption,
  ScorecardValueCell,
} from "@/features/scorecard/types";
import { TagBadges } from "@/components/scorecard/tag-picker";
import { DailyValuesSheet } from "@/components/scorecard/daily-values-sheet";
import { MetricDetailSheet } from "@/components/scorecard/metric-detail-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { ScorecardAnalyzeButton } from "@/components/scorecard/scorecard-analyze-button";
import { showErrorToast } from "@/components/feedback/toast";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { canManageOrg } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";
import type { FormulaBrokenRef } from "@/features/scorecard/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ScorecardMetricTableProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  canManageMetrics: boolean;
  metrics: ScorecardMetricWithOwner[];
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories?: ScorecardCategory[];
  tags?: ScorecardTag[];
  weeks: string[];
  valuesByMetric: Record<string, ScorecardValueCell[]>;
  groupBy?: "owner" | "team" | "none";
  periodType?: PeriodType;
  brokenRefsByMetricId?: Record<string, FormulaBrokenRef[]>;
  parseErrorsByMetricId?: Record<string, string>;
}

function buildGridRows(
  metrics: ScorecardMetricWithOwner[],
  weeks: string[],
  valuesByMetric: Record<string, ScorecardValueCell[]>,
  orgRole: OrgRole,
  currentUserId: string,
  isTeamLeader: boolean,
): ScorecardGridRow[] {
  return metrics.map((metric) => {
    const canEdit =
      metric.datasource !== "formula" &&
      orgRole !== "viewer" &&
      (metric.owner_id === currentUserId ||
        canManageOrg(orgRole) ||
        (isTeamLeader && metric.team_id !== null));

    return {
      metric,
      weeks: valuesByMetric[metric.id] ?? weeks.map((periodStart) => ({
        periodStart,
        actual: null,
        targetSnapshot: null,
        statusOverride: null,
        status: "na" as const,
        valueId: null,
        notes: null,
      })),
      canEdit,
    };
  });
}

function groupRowsByOwner(rows: ScorecardGridRow[]): Map<string, ScorecardGridRow[]> {
  const groups = new Map<string, ScorecardGridRow[]>();
  for (const row of rows) {
    const key = row.metric.owner.label;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }
  return groups;
}

function groupRowsByTeam(rows: ScorecardGridRow[]): Map<string, ScorecardGridRow[]> {
  const groups = new Map<string, ScorecardGridRow[]>();

  for (const row of rows) {
    const key = row.metric.teamName ?? "Organization";
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  return groups;
}

interface WeekCellProps {
  cell: ScorecardValueCell;
  metric: ScorecardMetricWithOwner;
  canEdit: boolean;
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  onOpenDailySheet?: (metric: ScorecardMetricWithOwner, cell: ScorecardValueCell) => void;
}

function WeekCell({
  cell,
  metric,
  canEdit,
  organizationId,
  orgSlug,
  teamSlug,
  onOpenDailySheet,
}: WeekCellProps) {
  const router = useRouter();
  const valueType = (metric.value_type ?? "number") as ValueType;
  const timeKind = getTimeKind(metric);
  const isTime = valueType === "time";
  const [draft, setDraft] = useState(metricValueToInput(cell.actual, valueType, timeKind));
  const [timeDraft, setTimeDraft] = useState<number | null>(cell.actual);
  const [isPending, startTransition] = useTransition();

  const isDailyCadence = metric.entry_cadence === "daily";
  const isFormulaCell = cell.isFormula === true || metric.datasource === "formula";

  const displayStatus =
    cell.statusOverride ??
    evaluateMetricForRow(metric, cell.actual, cell.targetSnapshot);

  const formattedActual =
    cell.actual === null ? null : formatMetricValue(cell.actual, valueType, timeKind);

  const rollupHint =
    cell.isRolledUp && cell.rollupMethod && cell.filledDayCount != null
      ? `${ROLLUP_METHOD_LABELS[cell.rollupMethod]} of ${cell.filledDayCount} day${cell.filledDayCount === 1 ? "" : "s"}`
      : null;

  function saveValue(nextValue: string | number | null) {
    const parsed = isTime
      ? (typeof nextValue === "number" ? nextValue : null)
      : parseMetricInputValue(String(nextValue), valueType, timeKind);

    if (!isTime && String(nextValue).trim() !== "" && Number.isNaN(parsed)) {
      showErrorToast("Invalid value", "Enter a numeric value or leave blank.");
      setDraft(metricValueToInput(cell.actual, valueType, timeKind));
      setTimeDraft(cell.actual);
      return;
    }

    if (isTime && parsed !== null && Number.isNaN(parsed)) {
      showErrorToast(
        "Invalid time",
        timeKind === "clock" ? "Use a time like 2 or 2:00 PM." : "Use hours:minutes (e.g. 1:30).",
      );
      setDraft(metricValueToInput(cell.actual, valueType, timeKind));
      setTimeDraft(cell.actual);
      return;
    }

    startTransition(async () => {
      const result = await upsertValue({
        organizationId,
        orgSlug,
        teamSlug,
        metricId: metric.id,
        periodStart: cell.periodStart,
        periodType: "weekly",
        actual: parsed,
      });

      if (!result.success) {
        showErrorToast("Could not save value", result.error);
        setDraft(metricValueToInput(cell.actual, valueType, timeKind));
        setTimeDraft(cell.actual);
        return;
      }

      router.refresh();
    });
  }

  if (isFormulaCell) {
    const formulaRollupHint =
      cell.isRolledUp && cell.rollupMethod && cell.filledDayCount != null
        ? `${ROLLUP_METHOD_LABELS[cell.rollupMethod]} of ${cell.filledDayCount} day${cell.filledDayCount === 1 ? "" : "s"}`
        : null;

    return (
      <TableCell
        className={cn(
          "min-w-[4.5rem] text-center text-sm tabular-nums",
          STATUS_CELL_CLASSES[displayStatus],
        )}
        data-testid="scorecard-cell-formula"
        title={
          formulaRollupHint
            ? `${formulaRollupHint} · ${cell.formulaHint ?? "Calculated from formula"}`
            : cell.formulaHint ?? "Calculated from formula"
        }
      >
        {cell.actual === null ? (
          <span className="text-muted-foreground" aria-label="No value">
            —
          </span>
        ) : (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span>{formattedActual}</span>
            {formulaRollupHint ? (
              <span className="text-[10px] font-normal opacity-70">{formulaRollupHint}</span>
            ) : null}
          </span>
        )}
      </TableCell>
    );
  }

  if (isDailyCadence) {
    return (
      <TableCell
        className={cn(
          "min-w-[4.5rem] cursor-pointer p-1 text-center text-sm tabular-nums",
          STATUS_CELL_CLASSES[displayStatus],
          canEdit && "hover:ring-1 hover:ring-ring/50",
        )}
        data-testid="scorecard-cell-daily-rollup"
        title={rollupHint ?? "Click to enter daily values"}
        onClick={() => {
          if (canEdit) {
            onOpenDailySheet?.(metric, cell);
          }
        }}
      >
        {formattedActual === null ? (
          <span className="text-muted-foreground" aria-label="No value">
            —
          </span>
        ) : (
          <span className="inline-flex flex-col items-center gap-0.5">
            <span>{formattedActual}</span>
            {rollupHint && (
              <span className="text-[10px] font-normal opacity-70">{rollupHint}</span>
            )}
          </span>
        )}
      </TableCell>
    );
  }

  if (!canEdit) {
    return (
      <TableCell
        className={cn(
          "min-w-[4.5rem] text-center text-sm tabular-nums",
          STATUS_CELL_CLASSES[displayStatus],
        )}
        data-testid="scorecard-cell-readonly"
      >
        {cell.actual === null ? (
          <span className="text-muted-foreground" aria-label="No value">
            —
          </span>
        ) : (
          <span>{formattedActual}</span>
        )}
      </TableCell>
    );
  }

  return (
    <TableCell
      className={cn(
        "min-w-[4.5rem] p-1",
        STATUS_CELL_CLASSES[displayStatus],
        isPending && "opacity-60",
      )}
      data-testid="scorecard-cell-editable"
    >
      {isTime ? (
        <TimeValueInput
          timeKind={timeKind}
          className="h-8 border-0 bg-transparent text-center text-sm shadow-none focus-visible:ring-1"
          value={timeDraft}
          aria-label={`Actual for week of ${cell.periodStart}`}
          onChange={(minutes) => {
            setTimeDraft(minutes);
            if (minutes !== cell.actual) {
              saveValue(minutes);
            }
          }}
          onInvalid={() => {
            showErrorToast(
              "Invalid time",
              timeKind === "clock" ? "Use a time like 2 or 2:00 PM." : "Use hours:minutes (e.g. 1:30).",
            );
            setTimeDraft(cell.actual);
          }}
        />
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          className="h-8 border-0 bg-transparent text-center text-sm shadow-none focus-visible:ring-1"
          value={draft}
          aria-label={`Actual for week of ${cell.periodStart}`}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const current = metricValueToInput(cell.actual, valueType, timeKind);
            if (draft !== current) {
              saveValue(draft);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          placeholder="—"
        />
      )}
    </TableCell>
  );
}

function FormulaBrokenRefsBadge({ refs }: { refs: FormulaBrokenRef[] }) {
  const archived = refs.filter((ref) => ref.reason === "archived");
  const missing = refs.filter((ref) => ref.reason === "missing");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          aria-label="Broken formula references"
          onClick={(event) => event.stopPropagation()}
        >
          <AlertTriangle className="size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-w-xs"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel>Broken references</DropdownMenuLabel>
        <div className="space-y-2 px-2 pb-2 text-sm">
          {archived.length > 0 ? (
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Archived</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {archived.map((ref) => (
                  <li key={`${ref.organizationId}:${ref.metricId}`}>
                    {ref.name ?? "Unknown measurable"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {missing.length > 0 ? (
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Missing</p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {missing.map((ref) => (
                  <li key={`${ref.organizationId}:${ref.metricId}`}>Unknown measurable</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FormulaParseErrorBadge({ error }: { error: string }) {
  return (
    <span
      className="inline-flex text-destructive"
      title={error}
      aria-label={`Formula syntax error: ${error}`}
    >
      <FileWarning className="size-3.5 shrink-0" />
    </span>
  );
}

export function ScorecardMetricTable({
  organizationId,
  orgSlug,
  teamSlug,
  orgRole,
  currentUserId,
  isTeamLeader,
  canManageMetrics,
  metrics,
  teams,
  members,
  categories = [],
  tags = [],
  weeks,
  valuesByMetric,
  groupBy = "owner",
  periodType = "weekly",
  brokenRefsByMetricId = {},
  parseErrorsByMetricId = {},
}: ScorecardMetricTableProps) {
  const [selectedRow, setSelectedRow] = useState<ScorecardGridRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dailySheet, setDailySheet] = useState<{
    metric: ScorecardMetricWithOwner;
    cell: ScorecardValueCell;
  } | null>(null);

  const rows = useMemo(
    () =>
      buildGridRows(
        metrics,
        weeks,
        valuesByMetric,
        orgRole,
        currentUserId,
        isTeamLeader,
      ),
    [metrics, weeks, valuesByMetric, orgRole, currentUserId, isTeamLeader],
  );

  const grouped = useMemo(() => {
    if (groupBy === "owner") return groupRowsByOwner(rows);
    if (groupBy === "team") return groupRowsByTeam(rows);
    return new Map([["", rows]]);
  }, [rows, groupBy]);

  if (metrics.length === 0) {
    return (
      <div data-testid="scorecard-empty-state">
        <EmptyState
          title="No metrics yet"
          description="Add measurable targets to start tracking weekly performance."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScorecardAnalyzeButton
        organizationId={organizationId}
        metrics={metrics}
        weeks={weeks}
        valuesByMetric={valuesByMetric}
      />
      <MetricDetailSheet
        row={selectedRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        organizationId={organizationId}
        orgSlug={orgSlug}
        teamSlug={teamSlug}
        canManage={canManageMetrics}
        teams={teams}
        members={members}
        categories={categories}
        tags={tags}
        periodType={periodType}
      />
      {dailySheet ? (
        <DailyValuesSheet
          key={`${dailySheet.metric.id}-${dailySheet.cell.periodStart}`}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDailySheet(null);
            }
          }}
          organizationId={organizationId}
          orgSlug={orgSlug}
          teamSlug={teamSlug}
          metric={dailySheet.metric}
          cell={dailySheet.cell}
        />
      ) : null}
      <div
        className="overflow-x-auto rounded-md border"
        data-testid="scorecard-metric-table"
      >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-[12rem] bg-background">
              Name
            </TableHead>
            <TableHead className="min-w-[8rem]">Team</TableHead>
            <TableHead className="min-w-[6rem]">Category</TableHead>
            <TableHead className="min-w-[5rem]">Target</TableHead>
            {weeks.map((week) => (
              <TableHead
                key={week}
                className="min-w-[4.5rem] text-center text-xs uppercase"
              >
                {formatPeriodLabel(week, periodType)}
              </TableHead>
            ))}
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(grouped.entries()).map(([groupName, teamRows]) => (
            <Fragment key={groupName || "all"}>
              {groupBy !== "none" && groupName && (
                <TableRow className="bg-muted/40">
                  <TableCell
                    colSpan={weeks.length + 5}
                    className="py-2 text-sm font-semibold"
                  >
                    {groupName}
                  </TableCell>
                </TableRow>
              )}
              {teamRows.map((row) => (
                <TableRow key={row.metric.id}>
                  <TableCell
                    className="sticky left-0 z-10 cursor-pointer bg-background font-medium hover:underline"
                    onClick={() => {
                      setSelectedRow(row);
                      setDetailOpen(true);
                    }}
                  >
                    <span className="inline-flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5">
                        {row.metric.name}
                        {row.metric.datasource === "formula" &&
                        parseErrorsByMetricId[row.metric.id] ? (
                          <FormulaParseErrorBadge
                            error={parseErrorsByMetricId[row.metric.id]!}
                          />
                        ) : null}
                        {row.metric.datasource === "formula" &&
                        !parseErrorsByMetricId[row.metric.id] &&
                        (brokenRefsByMetricId[row.metric.id]?.length ?? 0) > 0 ? (
                          <FormulaBrokenRefsBadge
                            refs={brokenRefsByMetricId[row.metric.id]!}
                          />
                        ) : null}
                      </span>
                      <TagBadges tags={row.metric.tags} />
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.metric.teamName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.metric.categoryName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {formatMetricDisplayTarget(row.metric)}
                  </TableCell>
                  {row.weeks.map((cell) => (
                    <WeekCell
                      key={`${row.metric.id}-${cell.periodStart}`}
                      cell={cell}
                      metric={row.metric}
                      canEdit={row.canEdit}
                      organizationId={organizationId}
                      orgSlug={orgSlug}
                      teamSlug={teamSlug}
                      onOpenDailySheet={(metric, cell) => setDailySheet({ metric, cell })}
                    />
                  ))}
                  <TableCell />
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
