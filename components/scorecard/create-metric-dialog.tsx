"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Plus } from "lucide-react";
import { createMetric } from "@/features/scorecard/actions";
import { createMetricSchema, type CreateMetricInput } from "@/features/scorecard/schema";
import type {
  ScorecardCategory,
  ScorecardMemberOption,
  ScorecardTeamOption,
} from "@/features/scorecard/types";
import type { RollupMethod, TargetOperator, TimeKind, ValueType } from "@/features/scorecard/utils";
import { TimeValueInput } from "@/components/scorecard/time-value-input";
import { FormulaMetricInput } from "@/components/scorecard/formula-metric-input";
import { FormulaHelpCheatSheet } from "@/components/scorecard/formula-help-cheat-sheet";
import { showErrorToast, showSuccessToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CreateMetricDialogProps {
  organizationId: string;
  orgSlug: string;
  teamSlug: string;
  teams: ScorecardTeamOption[];
  members: ScorecardMemberOption[];
  categories?: ScorecardCategory[];
  defaultOwnerId: string;
  defaultTeamId?: string;
}

const VALUE_TYPE_OPTIONS: { value: ValueType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percentage", label: "Percentage" },
  { value: "boolean", label: "Boolean" },
  { value: "time", label: "Time" },
];

const TIME_KIND_OPTIONS: { value: TimeKind; label: string; description: string }[] = [
  {
    value: "clock",
    label: "Time of day",
    description: "e.g. all orders shipped by 2:00 PM — enter the actual time daily, averaged on L10",
  },
  {
    value: "duration",
    label: "Duration",
    description: "e.g. 1 hour 30 minutes elapsed",
  },
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

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function getDefaultValues(
  organizationId: string,
  defaultOwnerId: string,
  defaultTeamId?: string,
): CreateMetricInput {
  return {
    organizationId,
    ownerId: defaultOwnerId,
    teamId: defaultTeamId ?? null,
    name: "",
    description: "",
    valueType: "number",
    timeKind: "duration",
    targetOperator: ">=",
    targetValue: undefined,
    targetMin: undefined,
    targetMax: undefined,
    entryCadence: "weekly",
    weeklyRollupMethod: null,
    tolerancePercent: 10,
    categoryId: null,
    datasource: "manual",
    formula: null,
  };
}

export function CreateMetricDialog({
  organizationId,
  orgSlug,
  teamSlug,
  teams,
  members,
  categories = [],
  defaultOwnerId,
  defaultTeamId,
}: CreateMetricDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateMetricInput>({
    resolver: zodResolver(createMetricSchema) as Resolver<CreateMetricInput>,
    defaultValues: getDefaultValues(organizationId, defaultOwnerId, defaultTeamId),
  });

  const valueType = form.watch("valueType");
  const timeKind = form.watch("timeKind");
  const targetOperator = form.watch("targetOperator");
  const entryCadence = form.watch("entryCadence");
  const datasource = form.watch("datasource");
  const teamId = form.watch("teamId");

  function applyClockTimeDefaults() {
    form.setValue("targetOperator", "<=");
    form.setValue("entryCadence", "daily");
    form.setValue("weeklyRollupMethod", "average");
  }

  const teamName =
    teams.find((team) => team.id === (form.watch("teamId") ?? defaultTeamId))?.name ??
    "Organization-wide";

  async function onSubmit(values: CreateMetricInput) {
    setIsSubmitting(true);
    const result = await createMetric({
      ...values,
      orgSlug,
      teamSlug,
      description: values.description || null,
      teamId: values.teamId || null,
      categoryId: values.categoryId || null,
      weeklyRollupMethod:
        values.entryCadence === "daily" ? values.weeklyRollupMethod ?? "sum" : null,
    });
    setIsSubmitting(false);

    if (!result.success) {
      showErrorToast("Could not create measurable", result.error);
      return;
    }

    showSuccessToast("Measurable created");
    form.reset(getDefaultValues(organizationId, defaultOwnerId, defaultTeamId));
    setOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" data-testid="add-metric-button">
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Create measurable
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create measurable</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-6 md:grid-cols-[1fr_220px]">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Metric name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Target</FormLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="valueType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Type</FormLabel>
                          <FormControl>
                            <select
                              className={selectClassName}
                              value={field.value}
                              onChange={(event) => {
                                const next = event.target.value as ValueType;
                                field.onChange(next);
                                if (next === "boolean") {
                                  form.setValue("targetOperator", "=");
                                  form.setValue("targetValue", 1);
                                }
                                if (next === "time") {
                                  form.setValue("timeKind", "clock");
                                  applyClockTimeDefaults();
                                }
                              }}
                            >
                              {VALUE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {valueType !== "boolean" && (
                      <FormField
                        control={form.control}
                        name="targetOperator"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Operator
                            </FormLabel>
                            <FormControl>
                              <select
                                className={selectClassName}
                                value={field.value}
                                onChange={field.onChange}
                              >
                                {OPERATOR_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {valueType === "time" && (
                    <FormField
                      control={form.control}
                      name="timeKind"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Time format
                          </FormLabel>
                          <FormControl>
                            <select
                              className={selectClassName}
                              value={field.value}
                              onChange={(event) => {
                                const next = event.target.value as TimeKind;
                                field.onChange(next);
                                if (next === "clock") {
                                  applyClockTimeDefaults();
                                }
                              }}
                            >
                              {TIME_KIND_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            {
                              TIME_KIND_OPTIONS.find((option) => option.value === timeKind)
                                ?.description
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {targetOperator === "between" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="targetMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Minimum
                            </FormLabel>
                            <FormControl>
                              {valueType === "time" ? (
                                <TimeValueInput
                                  timeKind={timeKind}
                                  value={field.value ?? null}
                                  onChange={(minutes) => field.onChange(minutes)}
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
                                <Input type="number" {...field} value={field.value ?? ""} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targetMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Maximum
                            </FormLabel>
                            <FormControl>
                              {valueType === "time" ? (
                                <TimeValueInput
                                  timeKind={timeKind}
                                  value={field.value ?? null}
                                  onChange={(minutes) => field.onChange(minutes)}
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
                                <Input type="number" {...field} value={field.value ?? ""} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="targetValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Value</FormLabel>
                          <FormControl>
                            {valueType === "boolean" ? (
                              <select
                                className={selectClassName}
                                value={field.value ?? 1}
                                onChange={(event) =>
                                  field.onChange(Number(event.target.value))
                                }
                              >
                                <option value={1}>Yes (1)</option>
                                <option value={0}>No (0)</option>
                              </select>
                            ) : valueType === "time" ? (
                              <TimeValueInput
                                timeKind={timeKind}
                                value={field.value ?? null}
                                onChange={(minutes) => field.onChange(minutes)}
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
                                type="number"
                                placeholder={
                                  valueType === "percentage" ? "0–100" : "Target value"
                                }
                                {...field}
                                value={field.value ?? ""}
                              />
                            )}
                          </FormControl>
                          {valueType === "time" && timeKind === "clock" && (
                            <FormDescription>
                              Deadline time — enter <strong>2</strong> or <strong>2:00 PM</strong> for
                              ship-by 2 PM. Use daily entry + average rollup for L10.
                            </FormDescription>
                          )}
                          {valueType === "time" && timeKind === "duration" && (
                            <FormDescription>
                              Enter duration as hours:minutes (e.g. 1:30).
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          className={cn(
                            "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          )}
                          placeholder="We suggest being as detailed as possible."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <aside className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Space</p>
                  <p className="text-sm">{teamName}</p>
                </div>

                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase text-muted-foreground">
                        Assignee
                      </FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          {members.map((member) => (
                            <option key={member.userId} value={member.userId}>
                              {member.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entryCadence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase text-muted-foreground">
                        Cadence
                      </FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value}
                          onChange={(event) => {
                            const next = event.target.value as "daily" | "weekly";
                            field.onChange(next);
                            if (next === "daily") {
                              form.setValue("weeklyRollupMethod", "sum");
                            } else {
                              form.setValue("weeklyRollupMethod", null);
                            }
                          }}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="daily">Daily</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {entryCadence === "daily" && (
                  <FormField
                    control={form.control}
                    name="weeklyRollupMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Weekly rollup (L10)
                        </FormLabel>
                        <FormControl>
                          <select
                            className={selectClassName}
                            value={field.value ?? "sum"}
                            onChange={(event) =>
                              field.onChange(event.target.value as RollupMethod)
                            }
                          >
                            {ROLLUP_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          How daily values combine for the weekly scorecard.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="datasource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase text-muted-foreground">
                        Datasource
                      </FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value ?? "manual"}
                          onChange={(event) => {
                            const next = event.target.value as "manual" | "formula";
                            field.onChange(next);
                            if (next === "manual") {
                              form.setValue("formula", null);
                            }
                          }}
                        >
                          <option value="manual">Manual entry</option>
                          <option value="formula">From a formula</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {datasource === "formula" ? (
                  <FormField
                    control={form.control}
                    name="formula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Formula
                        </FormLabel>
                        <FormControl>
                          <FormulaMetricInput
                            organizationId={organizationId}
                            teamId={teamId}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            valueType={valueType}
                            timeKind={timeKind}
                          />
                        </FormControl>
                        <FormulaHelpCheatSheet />
                        <FormDescription>
                          Search measurables to insert references. Use arithmetic or
                          SUM, AVG, MIN, MAX, IF, ROUND, ABS, COUNT.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {categories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Category
                        </FormLabel>
                        <FormControl>
                          <select
                            className={selectClassName}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value || null)
                            }
                          >
                            <option value="">Add category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!defaultTeamId && (
                  <FormField
                    control={form.control}
                    name="teamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase text-muted-foreground">
                          Team
                        </FormLabel>
                        <FormControl>
                          <select
                            className={selectClassName}
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value || null)
                            }
                          >
                            <option value="">Organization-wide</option>
                            {teams.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </aside>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="create-metric-submit">
                {isSubmitting ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
