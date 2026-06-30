import { z } from "zod";
import { validateFormulaExpression } from "@/features/scorecard/formula";
import {
  deriveTargetRule,
  formatDisplayTargetFromOperator,
  type EntryCadence,
  type RollupMethod,
  type TargetOperator,
  type TimeKind,
  type ValueType,
} from "@/features/scorecard/utils";

const targetRuleSchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "range",
  "exact",
  "boolean",
]);

const valueTypeSchema = z.enum([
  "number",
  "currency",
  "percentage",
  "boolean",
  "time",
]);

const targetOperatorSchema = z.enum([">=", "<=", "=", ">", "<", "between"]);

const entryCadenceSchema = z.enum(["daily", "weekly"]);

const rollupMethodSchema = z.enum([
  "sum",
  "average",
  "last",
  "min",
  "max",
  "count",
]);

const timeKindSchema = z.enum(["duration", "clock"]);

const datasourceSchema = z.enum(["manual", "formula"]);

function coerceOptionalNumber(val: unknown): number | null | undefined {
  if (val === undefined) {
    return undefined;
  }
  if (val === null || val === "") {
    return null;
  }
  if (typeof val === "number") {
    return Number.isNaN(val) ? null : val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

const optionalNumber = z.preprocess(
  coerceOptionalNumber,
  z.number().nullable().optional(),
);

const metricBaseSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  ownerId: z.string().uuid("Invalid owner"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  unit: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().uuid("Invalid category").nullable().optional(),
  valueType: valueTypeSchema.default("number"),
  timeKind: timeKindSchema.default("duration"),
  targetOperator: targetOperatorSchema.default(">="),
  entryCadence: entryCadenceSchema.default("weekly"),
  weeklyRollupMethod: rollupMethodSchema.nullable().optional(),
  targetRule: targetRuleSchema.optional(),
  targetValue: optionalNumber,
  targetMin: optionalNumber,
  targetMax: optionalNumber,
  tolerancePercent: z
    .number()
    .min(0, "Tolerance must be at least 0")
    .max(100, "Tolerance must be at most 100")
    .default(10),
  displayOrder: z.number().int().min(0).optional(),
  datasource: datasourceSchema.default("manual"),
  formula: z.string().trim().max(2000).nullable().optional(),
});

function validateCadenceFields(
  data: Pick<
    z.infer<typeof metricBaseSchema>,
    "entryCadence" | "weeklyRollupMethod"
  >,
  ctx: z.RefinementCtx,
) {
  if (data.entryCadence === "daily" && !data.weeklyRollupMethod) {
    ctx.addIssue({
      code: "custom",
      message: "Weekly rollup method is required for daily metrics",
      path: ["weeklyRollupMethod"],
    });
  }

  if (data.entryCadence === "weekly" && data.weeklyRollupMethod) {
    ctx.addIssue({
      code: "custom",
      message: "Weekly rollup applies only to daily metrics",
      path: ["weeklyRollupMethod"],
    });
  }
}

function validateTargetFields(
  data: z.infer<typeof metricBaseSchema> | (Omit<z.infer<typeof metricBaseSchema>, "datasource" | "formula"> & {
    datasource?: z.infer<typeof datasourceSchema>;
    formula?: string | null;
  }),
  ctx: z.RefinementCtx,
) {
  const valueType = data.valueType ?? "number";
  const targetOperator = data.targetOperator ?? ">=";

  validateCadenceFields(data, ctx);

  if (valueType === "boolean") {
    if (targetOperator !== "=") {
      ctx.addIssue({
        code: "custom",
        message: "Boolean metrics must use the equals operator",
        path: ["targetOperator"],
      });
    }
    if (data.targetValue !== 0 && data.targetValue !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Boolean metrics require a target of 0 or 1",
        path: ["targetValue"],
      });
    }
    return;
  }

  if (targetOperator === "between") {
    if (data.targetMin === null || data.targetMin === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum target is required for between metrics",
        path: ["targetMin"],
      });
    }
    if (data.targetMax === null || data.targetMax === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Maximum target is required for between metrics",
        path: ["targetMax"],
      });
    }
    if (
      data.targetMin !== null &&
      data.targetMin !== undefined &&
      data.targetMax !== null &&
      data.targetMax !== undefined &&
      data.targetMin > data.targetMax
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum must be less than or equal to maximum",
        path: ["targetMax"],
      });
    }
    return;
  }

  if (data.targetValue === null || data.targetValue === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Target value is required",
      path: ["targetValue"],
    });
  }
}

export function normalizeMetricInput(
  data: Omit<z.infer<typeof metricBaseSchema>, "datasource" | "formula"> & {
    datasource?: z.infer<typeof datasourceSchema>;
    formula?: string | null;
  },
): z.infer<typeof metricBaseSchema> & {
  targetRule: z.infer<typeof targetRuleSchema>;
  displayTarget: string;
} {
  const valueType = (data.valueType ?? "number") as ValueType;
  const timeKind = (data.timeKind ?? "duration") as TimeKind;
  const targetOperator = (data.targetOperator ?? ">=") as TargetOperator;
  const entryCadence = (data.entryCadence ?? "weekly") as EntryCadence;
  const weeklyRollupMethod =
    entryCadence === "daily"
      ? ((data.weeklyRollupMethod ??
          (timeKind === "clock" ? "average" : "sum")) as RollupMethod)
      : null;

  const targetRule = deriveTargetRule(valueType, targetOperator);
  const displayTarget = formatDisplayTargetFromOperator(
    targetOperator,
    data.targetValue ?? null,
    data.targetMin,
    data.targetMax,
    valueType,
    timeKind,
  );

  return {
    ...data,
    datasource: data.datasource ?? "manual",
    formula: data.formula ?? null,
    valueType,
    timeKind,
    targetOperator,
    entryCadence,
    weeklyRollupMethod,
    targetRule,
    displayTarget,
  };
}

function validateFormulaFields(
  data: Pick<z.infer<typeof metricBaseSchema>, "datasource" | "formula">,
  ctx: z.RefinementCtx,
) {
  if (data.datasource === "formula") {
    const formula = data.formula?.trim() ?? "";
    if (!formula) {
      ctx.addIssue({
        code: "custom",
        message: "Formula is required when datasource is From a formula",
        path: ["formula"],
      });
      return;
    }

    const formulaError = validateFormulaExpression(formula);
    if (formulaError) {
      ctx.addIssue({
        code: "custom",
        message: formulaError,
        path: ["formula"],
      });
    }
  } else if (data.formula) {
    ctx.addIssue({
      code: "custom",
      message: "Formula is only allowed for formula datasource",
      path: ["formula"],
    });
  }
}

export const createMetricSchema = metricBaseSchema
  .superRefine(validateTargetFields)
  .superRefine(validateFormulaFields);

export const createScorecardCategorySchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #6366f1")
    .default("#6366f1"),
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export const createTagSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #6366f1")
    .optional(),
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export const setMetricTagsSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  metricId: z.string().uuid("Invalid metric"),
  tagIds: z.array(z.string().uuid("Invalid tag id")),
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

const tagIdsSchema = z.array(z.string().uuid("Invalid tag id")).optional();

export const createMetricActionSchema = createMetricSchema
  .extend({
    orgSlug: z.string().trim().min(1).optional(),
    teamSlug: z.string().trim().min(1).optional(),
    tagIds: tagIdsSchema,
  });

const metricUpdateFieldsSchema = z.object({
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  ownerId: z.string().uuid("Invalid owner").optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters")
    .optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  categoryId: z.string().uuid("Invalid category").nullable().optional(),
  valueType: valueTypeSchema.optional(),
  timeKind: timeKindSchema.optional(),
  targetOperator: targetOperatorSchema.optional(),
  entryCadence: entryCadenceSchema.optional(),
  weeklyRollupMethod: rollupMethodSchema.nullable().optional(),
  targetRule: targetRuleSchema.optional(),
  targetValue: optionalNumber,
  targetMin: optionalNumber,
  targetMax: optionalNumber,
  tolerancePercent: z
    .number()
    .min(0, "Tolerance must be at least 0")
    .max(100, "Tolerance must be at most 100")
    .optional(),
  displayOrder: z.number().int().min(0).optional(),
  archived: z.boolean().optional(),
  datasource: datasourceSchema.optional(),
  formula: z.string().trim().max(2000).nullable().optional(),
});

export const updateMetricSchema = z
  .object({
    metricId: z.string().uuid("Invalid metric"),
    organizationId: z.string().uuid("Invalid organization"),
  })
  .merge(metricUpdateFieldsSchema)
  .superRefine((data, ctx) => {
    const hasCadenceUpdates =
      data.entryCadence !== undefined || data.weeklyRollupMethod !== undefined;
    const hasTargetUpdates =
      data.valueType !== undefined ||
      data.targetOperator !== undefined ||
      data.targetValue !== undefined ||
      data.targetMin !== undefined ||
      data.targetMax !== undefined;

    if (hasCadenceUpdates) {
      validateCadenceFields(
        {
          entryCadence: data.entryCadence ?? "weekly",
          weeklyRollupMethod: data.weeklyRollupMethod ?? null,
        },
        ctx,
      );
    }

    if (hasTargetUpdates) {
      validateTargetFields(
        {
          organizationId: data.organizationId,
          ownerId: data.ownerId ?? "00000000-0000-0000-0000-000000000000",
          name: data.name ?? "metric",
          valueType: data.valueType ?? "number",
          timeKind: data.timeKind ?? "duration",
          targetOperator: data.targetOperator ?? ">=",
          entryCadence: data.entryCadence ?? "weekly",
          weeklyRollupMethod: data.weeklyRollupMethod ?? null,
          targetRule: data.targetRule,
          targetValue: data.targetValue,
          targetMin: data.targetMin,
          targetMax: data.targetMax,
          tolerancePercent: data.tolerancePercent ?? 10,
          teamId: data.teamId,
          unit: data.unit,
          description: data.description,
          categoryId: data.categoryId,
          displayOrder: data.displayOrder,
        },
        ctx,
      );
    }

    if (data.datasource !== undefined || data.formula !== undefined) {
      validateFormulaFields(
        {
          datasource: data.datasource ?? "manual",
          formula: data.formula ?? null,
        },
        ctx,
      );
    }
  });

export const updateMetricActionSchema = updateMetricSchema.extend({
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
  applyTargetToPastEntries: z.boolean().optional(),
});

export const upsertValueSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  metricId: z.string().uuid("Invalid metric"),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Period must be a valid date (YYYY-MM-DD)"),
  periodType: z.enum(["daily", "weekly"]).optional(),
  actual: z.number().nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
  statusOverride: z.enum(["green", "yellow", "red", "na"]).nullable().optional(),
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export const reorderMetricsSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  orderedMetricIds: z
    .array(z.string().uuid("Invalid metric id"))
    .min(1, "At least one metric is required"),
  orgSlug: z.string().trim().min(1).optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
export type UpsertValueInput = z.infer<typeof upsertValueSchema>;
export type ReorderMetricsInput = z.infer<typeof reorderMetricsSchema>;
export type CreateScorecardCategoryInput = z.infer<typeof createScorecardCategorySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type SetMetricTagsInput = z.infer<typeof setMetricTagsSchema>;
