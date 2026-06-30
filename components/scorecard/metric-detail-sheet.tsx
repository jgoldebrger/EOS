"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil } from "lucide-react";
import {
  findBrokenFormulaReferences,
  setMetricTags,
  updateMetric,
  type FormulaBrokenRef,
} from "@/features/scorecard/actions";
import type {
  ScorecardCategory,
  ScorecardGridRow,
  ScorecardMemberOption,
  ScorecardTag,
  ScorecardTeamOption,
} from "@/features/scorecard/types";
import {
  formatMetricDisplayTarget,
  formatMetricValue,
  formatDisplayTargetFromOperator,
  getDatesInWeek,
  getTimeKind,
  ROLLUP_METHOD_LABELS,
  STATUS_CELL_CLASSES,
  type PeriodType,
  type RollupMethod,
  type TargetOperator,
  type TimeKind,
  type ValueType,
} from "@/features/scorecard/utils";
import { CreateCategoryDialog } from "@/components/scorecard/create-category-dialog";
import { TagBadges, TagPicker } from "@/components/scorecard/tag-picker";
import { MetricTrendChart } from "@/components/scorecard/metric-trend-chart";
import { FormulaMetricInput } from "@/components/scorecard/formula-metric-input";
import { FormulaHelpCheatSheet } from "@/components/scorecard/formula-help-cheat-sheet";
import { formatFormulaForDisplay } from "@/features/scorecard/formula";
import { TimeValueInput } from "@/components/scorecard/time-value-input";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MetricDetailSheetProps {
  row: ScorecardGridRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  canManage: boolean;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories?: ScorecardCategory[];
  tags?: ScorecardTag[];
  periodType?: PeriodType;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const VALUE_TYPE_OPTIONS: { value: ValueType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "boolean", label: "Boolean" },
  { value: "time", label: "Time" },
];

const OPERATOR_OPTIONS: { value: TargetOperator; label: string }[] = [
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "=", label: "=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: "between", label: "Between" },
];

const ROLLUP_OPTIONS: { value: RollupMethod; label: string }[] = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "last", label: "Last (most recent day)" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "count", label: "Count" },
];

function formatEntryRange(periodStart: string): string {
  const dates = getDatesInWeek(periodStart);
  const start = new Date(`${dates[0]}T00:00:00`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
  const fmt = (date: Date) =>
    date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  return `${fmt(start)} – ${fmt(end)}`;
}

interface MetricDetailContentProps {
  row: ScorecardGridRow;
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  canManage: boolean;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories: ScorecardCategory[];
  tags: ScorecardTag[];
  periodType: PeriodType;
  onClose: () => void;
}

function MetricDetailContent({
  row,
  organizationId,
  orgSlug,
  teamSlug,
  canManage,
  teams,
  members,
  categories,
  tags,
  periodType,
  onClose,
}: MetricDetailContentProps) {
  const router = useRouter();
  const { metric, weeks } = row;
  const [localCategories, setLocalCategories] = useState(categories);
  const [localTags, setLocalTags] = useState(tags);
  const [draftTagIds, setDraftTagIds] = useState(metric.tags.map((tag) => tag.id));

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  useEffect(() => {
    setDraftTagIds(metric.tags.map((tag) => tag.id));
  }, [metric.id, metric.tags]);
  const valueType = (metric.value_type ?? "number") as ValueType;
  const timeKind = getTimeKind(metric);
  const isTime = valueType === "time";

  const [name, setName] = useState(metric.name);
  const [description, setDescription] = useState(metric.description ?? "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [draftValueType, setDraftValueType] = useState<ValueType>(valueType);
  const [draftTimeKind, setDraftTimeKind] = useState<TimeKind>(timeKind);
  const [draftOperator, setDraftOperator] = useState<TargetOperator>(
    (metric.target_operator ?? ">=") as TargetOperator,
  );
  const [draftTargetValue, setDraftTargetValue] = useState<number | null>(
    metric.target_value === null || metric.target_value === undefined
      ? null
      : Number(metric.target_value),
  );
  const [draftTargetMin, setDraftTargetMin] = useState<number | null>(
    metric.target_min === null || metric.target_min === undefined
      ? null
      : Number(metric.target_min),
  );
  const [draftTargetMax, setDraftTargetMax] = useState<number | null>(
    metric.target_max === null || metric.target_max === undefined
      ? null
      : Number(metric.target_max),
  );
  const [draftCadence, setDraftCadence] = useState<"daily" | "weekly">(
    (metric.entry_cadence === "daily" ? "daily" : "weekly"),
  );
  const [draftRollup, setDraftRollup] = useState<RollupMethod | null>(
    (metric.weekly_rollup_method as RollupMethod | null) ?? "sum",
  );
  const [draftOwnerId, setDraftOwnerId] = useState(metric.owner_id);
  const [draftCategoryId, setDraftCategoryId] = useState(metric.category_id ?? "");
  const [draftDatasource, setDraftDatasource] = useState<"manual" | "formula">(
    metric.datasource === "formula" ? "formula" : "manual",
  );
  const [draftFormula, setDraftFormula] = useState(metric.formula ?? "");
  const [formulaBrokenRefs, setFormulaBrokenRefs] = useState<FormulaBrokenRef[]>([]);
  const [applyTargetToPastEntries, setApplyTargetToPastEntries] = useState(false);

  useEffect(() => {
    if (metric.datasource !== "formula" || !metric.formula?.trim()) {
      setFormulaBrokenRefs([]);
      return;
    }

    let cancelled = false;
    void findBrokenFormulaReferences({
      organizationId,
      formula: metric.formula,
    }).then((refs) => {
      if (!cancelled) {
        setFormulaBrokenRefs(refs);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [organizationId, metric.datasource, metric.formula]);

  const entries = [...weeks].reverse();

  const targetBadgeLabel = editingTarget
    ? formatDisplayTargetFromOperator(
        draftOperator,
        draftTargetValue,
        draftTargetMin,
        draftTargetMax,
        draftValueType,
        draftTimeKind,
      )
    : formatMetricDisplayTarget(metric);

  function saveMetric(updates: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateMetric({
        ...updates,
        organizationId,
        metricId: metric.id,
        orgSlug,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast("Could not save measurable", result.error);
        return;
      }

      showSuccessToast("Measurable saved");
      setEditingTarget(false);
      setEditingDescription(false);
      router.refresh();
    });
  }

  function handleSaveTags(nextTagIds: string[]) {
    setDraftTagIds(nextTagIds);
    startTransition(async () => {
      const result = await setMetricTags({
        organizationId,
        metricId: metric.id,
        tagIds: nextTagIds,
        orgSlug,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast("Could not save tags", result.error);
        return;
      }

      showSuccessToast("Tags updated");
      router.refresh();
    });
  }

  function handleSaveTarget() {
    saveMetric({
      organizationId,
      metricId: metric.id,
      valueType: draftValueType,
      timeKind: draftTimeKind,
      targetOperator: draftOperator,
      targetValue: draftTargetValue,
      targetMin: draftTargetMin,
      targetMax: draftTargetMax,
      entryCadence: draftCadence as "daily" | "weekly",
      weeklyRollupMethod:
        draftCadence === "daily" ? draftRollup ?? "sum" : null,
      applyTargetToPastEntries:
        draftOperator === "between" ? undefined : applyTargetToPastEntries,
    });
    setApplyTargetToPastEntries(false);
  }

  function handleSaveDescription() {
    saveMetric({
      organizationId,
      metricId: metric.id,
      description: description.trim() || null,
    });
  }

  function handleSaveName() {
    if (!name.trim()) {
      showErrorToast("Name required", "Enter a measurable name.");
      return;
    }
    saveMetric({
      organizationId,
      metricId: metric.id,
      name: name.trim(),
    });
  }

  function handleSaveSettings() {
    saveMetric({
      organizationId,
      metricId: metric.id,
      ownerId: draftOwnerId,
      categoryId: draftCategoryId || null,
      entryCadence: draftCadence as "daily" | "weekly",
      weeklyRollupMethod:
        draftCadence === "daily" ? draftRollup ?? "sum" : null,
      datasource: draftDatasource,
      formula: draftDatasource === "formula" ? draftFormula : null,
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await updateMetric({
        organizationId,
        metricId: metric.id,
        archived: true,
        orgSlug,
        teamSlug,
      });

      if (!result.success) {
        showErrorToast("Could not archive measurable", result.error);
        return;
      }

      showSuccessToast("Measurable archived");
      setArchiveOpen(false);
      router.refresh();
      onClose();
    });
  }

  const teamName =
    teams.find((team) => team.id === metric.team_id)?.name ??
    metric.teamName ??
    "Organization-wide";

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0 space-y-6">
          <SheetHeader className="space-y-3 p-0 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              {canManage ? (
                <Input
                  className="text-xl font-semibold"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={handleSaveName}
                />
              ) : (
                <SheetTitle className="text-xl leading-snug">{metric.name}</SheetTitle>
              )}
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {targetBadgeLabel}
              </Badge>
            </div>
            <SheetDescription className="sr-only">Measurable detail</SheetDescription>
          </SheetHeader>

          {canManage && (
            <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Target</h3>
                {!editingTarget ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTarget(true)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
              </div>

              {editingTarget ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <select
                        className={selectClassName}
                        value={draftValueType}
                        onChange={(event) =>
                          setDraftValueType(event.target.value as ValueType)
                        }
                      >
                        {VALUE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {draftValueType !== "boolean" && (
                      <div>
                        <label className="text-xs text-muted-foreground">Operator</label>
                        <select
                          className={selectClassName}
                          value={draftOperator}
                          onChange={(event) =>
                            setDraftOperator(event.target.value as TargetOperator)
                          }
                        >
                          {OPERATOR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {draftValueType === "time" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Time format</label>
                      <select
                        className={selectClassName}
                        value={draftTimeKind}
                        onChange={(event) =>
                          setDraftTimeKind(event.target.value as TimeKind)
                        }
                      >
                        <option value="clock">Time of day</option>
                        <option value="duration">Duration</option>
                      </select>
                    </div>
                  )}

                  {draftOperator === "between" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Minimum</label>
                        {draftValueType === "time" ? (
                          <TimeValueInput
                            timeKind={draftTimeKind}
                            value={draftTargetMin}
                            onChange={setDraftTargetMin}
                          />
                        ) : (
                          <Input
                            type="number"
                            value={draftTargetMin ?? ""}
                            onChange={(event) =>
                              setDraftTargetMin(
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Maximum</label>
                        {draftValueType === "time" ? (
                          <TimeValueInput
                            timeKind={draftTimeKind}
                            value={draftTargetMax}
                            onChange={setDraftTargetMax}
                          />
                        ) : (
                          <Input
                            type="number"
                            value={draftTargetMax ?? ""}
                            onChange={(event) =>
                              setDraftTargetMax(
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground">Value</label>
                      {draftValueType === "boolean" ? (
                        <select
                          className={selectClassName}
                          value={draftTargetValue ?? 1}
                          onChange={(event) =>
                            setDraftTargetValue(Number(event.target.value))
                          }
                        >
                          <option value={1}>Yes (1)</option>
                          <option value={0}>No (0)</option>
                        </select>
                      ) : draftValueType === "time" ? (
                        <TimeValueInput
                          timeKind={draftTimeKind}
                          value={draftTargetValue}
                          onChange={setDraftTargetValue}
                        />
                      ) : (
                        <Input
                          type="number"
                          value={draftTargetValue ?? ""}
                          onChange={(event) =>
                            setDraftTargetValue(
                              event.target.value === ""
                                ? null
                                : Number(event.target.value),
                            )
                          }
                        />
                      )}
                    </div>
                  )}

                  {draftOperator !== "between" && (
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border border-input"
                        checked={applyTargetToPastEntries}
                        onChange={(event) =>
                          setApplyTargetToPastEntries(event.target.checked)
                        }
                      />
                      <span>
                        Also change the target for all past entries
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {applyTargetToPastEntries
                            ? "Past and future entries will use the new target."
                            : "Only new entries use the new target; past weeks keep the previous target."}
                        </span>
                      </span>
                    </label>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveTarget}
                      disabled={isPending}
                    >
                      Save target
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTarget(false);
                        setApplyTargetToPastEntries(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {targetBadgeLabel}
                  {metric.entry_cadence === "daily" && metric.weekly_rollup_method
                    ? ` · Weekly ${ROLLUP_METHOD_LABELS[metric.weekly_rollup_method as RollupMethod].toLowerCase()}`
                    : ""}
                </p>
              )}
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Description</h3>
              {canManage && !editingDescription && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingDescription(true)}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
            {canManage && editingDescription ? (
              <div className="space-y-2">
                <textarea
                  className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  value={description}
                  placeholder="Add a description…"
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDescription}
                    disabled={isPending}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDescription(metric.description ?? "");
                      setEditingDescription(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {metric.description?.trim() || "Click edit to add a description."}
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Trend</h3>
            <MetricTrendChart metric={metric} values={weeks} periodType={periodType} />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Entries</h3>
            <div className="divide-y rounded-lg border">
              {entries.map((cell) => (
                <div
                  key={cell.periodStart}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{formatEntryRange(cell.periodStart)}</p>
                    {cell.isRolledUp && cell.filledDayCount != null && (
                      <p className="text-xs text-muted-foreground">
                        {cell.rollupMethod
                          ? ROLLUP_METHOD_LABELS[cell.rollupMethod]
                          : "Rollup"}{" "}
                        of {cell.filledDayCount} day
                        {cell.filledDayCount === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "rounded px-2 py-1 tabular-nums",
                      STATUS_CELL_CLASSES[cell.status],
                    )}
                  >
                    {cell.actual === null
                      ? "N/A"
                      : formatMetricValue(cell.actual, valueType, timeKind)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Settings</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Space</p>
            <p className="text-sm">{teamName}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Assignee</p>
            {canManage ? (
              <select
                className={selectClassName}
                value={draftOwnerId}
                onChange={(event) => setDraftOwnerId(event.target.value)}
                onBlur={handleSaveSettings}
              >
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <OwnerAvatar name={metric.owner.label} size="sm" />
                <span>{metric.owner.label}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Cadence</p>
            {canManage ? (
              <select
                className={selectClassName}
                value={draftCadence}
                onChange={(event) => {
                  const next = event.target.value as "daily" | "weekly";
                  setDraftCadence(next);
                  if (next === "daily" && !draftRollup) {
                    setDraftRollup("sum");
                  }
                }}
                onBlur={handleSaveSettings}
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            ) : (
              <p className="text-sm capitalize">{metric.entry_cadence ?? "weekly"}</p>
            )}
          </div>

          {draftCadence === "daily" && canManage && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Weekly rollup</p>
              <select
                className={selectClassName}
                value={draftRollup ?? "sum"}
                onChange={(event) =>
                  setDraftRollup(event.target.value as RollupMethod)
                }
                onBlur={handleSaveSettings}
              >
                {ROLLUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Datasource</p>
            {canManage ? (
              <select
                className={selectClassName}
                value={draftDatasource}
                onChange={(event) => {
                  const next = event.target.value as "manual" | "formula";
                  setDraftDatasource(next);
                  if (next === "manual") {
                    setDraftFormula("");
                  }
                }}
                onBlur={handleSaveSettings}
              >
                <option value="manual">Manual entry</option>
                <option value="formula">From a formula</option>
              </select>
            ) : (
              <p className="text-sm capitalize">
                {metric.datasource === "formula" ? "From a formula" : "Manual entry"}
              </p>
            )}
          </div>

          {draftDatasource === "formula" ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Formula</p>
              {canManage ? (
                <>
                  <FormulaMetricInput
                    organizationId={organizationId}
                    teamId={metric.team_id}
                    value={draftFormula}
                    onChange={setDraftFormula}
                    onBlur={handleSaveSettings}
                    valueType={draftValueType}
                    timeKind={draftTimeKind}
                    formulaTokens={
                      metric.formula_tokens as import("@/features/scorecard/formula").FormulaMetricToken[] | null
                    }
                  />
                  <FormulaHelpCheatSheet />
                </>
              ) : (
                <>
                  <p className="text-sm">
                    {formatFormulaForDisplay(
                      metric.formula ?? "",
                      metric.formula_tokens as import("@/features/scorecard/formula").FormulaMetricToken[] | null,
                    ) || "—"}
                  </p>
                  {formulaBrokenRefs.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formulaBrokenRefs.map((ref) => (
                        <Badge
                          key={`${ref.organizationId}:${ref.metricId}`}
                          variant="outline"
                          className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                        >
                          {ref.reason === "archived"
                            ? `Archived: ${ref.name ?? "measurable"}`
                            : "Missing measurable reference"}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Category</p>
            {canManage ? (
              <div className="flex items-center gap-2">
                <select
                  className={selectClassName}
                  value={draftCategoryId}
                  onChange={(event) => setDraftCategoryId(event.target.value)}
                  onBlur={handleSaveSettings}
                >
                  <option value="">No category</option>
                  {localCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <CreateCategoryDialog
                  organizationId={organizationId}
                  orgSlug={orgSlug}
                  teamId={metric.team_id ?? undefined}
                  teamSlug={teamSlug}
                  onCreated={(category) => {
                    setLocalCategories((prev) => [...prev, category]);
                    setDraftCategoryId(category.id);
                    saveMetric({
                      organizationId,
                      metricId: metric.id,
                      ownerId: draftOwnerId,
                      categoryId: category.id,
                      entryCadence: draftCadence as "daily" | "weekly",
                      weeklyRollupMethod:
                        draftCadence === "daily" ? draftRollup ?? "sum" : null,
                      datasource: draftDatasource,
                      formula: draftDatasource === "formula" ? draftFormula : null,
                    });
                  }}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      Add
                    </Button>
                  }
                />
              </div>
            ) : (
              <p className="text-sm">{metric.categoryName ?? "—"}</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tags</p>
            {canManage ? (
              <TagPicker
                organizationId={organizationId}
                orgSlug={orgSlug}
                teamId={metric.team_id ?? undefined}
                teamSlug={teamSlug}
                tags={localTags}
                selectedTagIds={draftTagIds}
                onChange={handleSaveTags}
                onTagsChange={setLocalTags}
              />
            ) : (
              <TagBadges tags={metric.tags} />
            )}
          </div>

          {canManage && (
            <div className="space-y-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </div>
          )}

          <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
            {metric.created_at && (
              <p>
                Created{" "}
                {new Date(metric.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {metric.updated_at && (
              <p>
                Last updated{" "}
                {new Date(metric.updated_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive measurable?"
        description="This removes it from the active scorecard. You can restore it later from archived metrics."
        confirmLabel="Archive"
        onConfirm={handleArchive}
        isLoading={isPending}
      />
    </>
  );
}

export function MetricDetailSheet({
  row,
  open,
  onOpenChange,
  organizationId,
  orgSlug,
  teamSlug,
  canManage,
  teams,
  members,
  categories = [],
  tags = [],
  periodType = "weekly",
}: MetricDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-5xl">
        {open && row ? (
          <MetricDetailContent
            key={row.metric.id}
            row={row}
            organizationId={organizationId}
            orgSlug={orgSlug}
            teamSlug={teamSlug}
            canManage={canManage}
            teams={teams}
            members={members}
            categories={categories}
            tags={tags}
            periodType={periodType}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
