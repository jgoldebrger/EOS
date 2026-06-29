"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { upsertValue } from "@/features/scorecard/actions";
import {
  evaluateMetricStatus,
  formatWeekLabel,
  STATUS_CELL_CLASSES,
  type TargetRule,
} from "@/features/scorecard/utils";
import type {
  ScorecardGridRow,
  ScorecardMetricWithOwner,
  ScorecardValueCell,
} from "@/features/scorecard/types";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { EmptyState } from "@/components/shared/empty-state";
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

interface ScorecardMetricTableProps {
  organizationId: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  metrics: ScorecardMetricWithOwner[];
  weeks: string[];
  valuesByMetric: Record<string, ScorecardValueCell[]>;
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
}

function WeekCell({ cell, metric, canEdit, organizationId }: WeekCellProps) {
  const [draft, setDraft] = useState(
    cell.actual === null ? "" : String(cell.actual),
  );
  const [isPending, startTransition] = useTransition();

  const displayStatus =
    cell.statusOverride ??
    evaluateMetricStatus(
      metric.target_rule as TargetRule,
      cell.actual,
      cell.targetSnapshot ?? (metric.target_value === null ? null : Number(metric.target_value)),
      Number(metric.tolerance_percent),
      {
        min: metric.target_min === null ? null : Number(metric.target_min),
        max: metric.target_max === null ? null : Number(metric.target_max),
      },
    );

  function saveValue(nextValue: string) {
    const trimmed = nextValue.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (trimmed !== "" && Number.isNaN(parsed)) {
      showErrorToast("Invalid number", "Enter a numeric value or leave blank.");
      setDraft(cell.actual === null ? "" : String(cell.actual));
      return;
    }

    startTransition(async () => {
      const result = await upsertValue({
        organizationId,
        metricId: metric.id,
        periodStart: cell.periodStart,
        actual: parsed,
      });

      if (!result.success) {
        showErrorToast("Could not save value", result.error);
        setDraft(cell.actual === null ? "" : String(cell.actual));
      }
    });
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
          <span>{cell.actual}</span>
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
      <Input
        type="number"
        inputMode="decimal"
        className="h-8 border-0 bg-transparent text-center text-sm shadow-none focus-visible:ring-1"
        value={draft}
        aria-label={`Actual for week of ${cell.periodStart}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const current =
            cell.actual === null ? "" : String(cell.actual);
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
    </TableCell>
  );
}

export function ScorecardMetricTable({
  organizationId,
  orgRole,
  currentUserId,
  isTeamLeader,
  metrics,
  weeks,
  valuesByMetric,
}: ScorecardMetricTableProps) {
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

  const grouped = useMemo(() => groupRowsByTeam(rows), [rows]);

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
    <div
      className="overflow-x-auto rounded-md border"
      data-testid="scorecard-metric-table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 min-w-[12rem] bg-background">
              Metric
            </TableHead>
            <TableHead className="min-w-[3rem]">Owner</TableHead>
            {weeks.map((week) => (
              <TableHead
                key={week}
                className="min-w-[4.5rem] text-center text-xs"
              >
                {formatWeekLabel(week)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(grouped.entries()).map(([teamName, teamRows]) => (
            <Fragment key={teamName}>
              {grouped.size > 1 && (
                <TableRow className="bg-muted/40">
                  <TableCell
                    colSpan={weeks.length + 2}
                    className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {teamName}
                  </TableCell>
                </TableRow>
              )}
              {teamRows.map((row) => (
                <TableRow key={row.metric.id}>
                  <TableCell className="sticky left-0 z-10 bg-background">
                    <div className="space-y-0.5">
                      <p className="font-medium">{row.metric.name}</p>
                      {row.metric.unit && (
                        <p className="text-xs text-muted-foreground">{row.metric.unit}</p>
                      )}
                      {row.metric.target_value !== null && row.metric.target_rule !== "range" && (
                        <p className="text-xs text-muted-foreground">
                          Target: {Number(row.metric.target_value)}
                        </p>
                      )}
                      {row.metric.target_rule === "range" && (
                        <p className="text-xs text-muted-foreground">
                          Range: {Number(row.metric.target_min)}–{Number(row.metric.target_max)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OwnerAvatar
                      name={row.metric.owner.label}
                      size="sm"
                    />
                  </TableCell>
                  {row.weeks.map((cell) => (
                    <WeekCell
                      key={`${row.metric.id}-${cell.periodStart}`}
                      cell={cell}
                      metric={row.metric}
                      canEdit={row.canEdit}
                      organizationId={organizationId}
                    />
                  ))}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
