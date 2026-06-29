import { z } from "zod";

const targetRuleSchema = z.enum([
  "higher_is_better",
  "lower_is_better",
  "range",
  "exact",
  "boolean",
]);

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
  targetRule: targetRuleSchema,
  targetValue: z.number().nullable().optional(),
  targetMin: z.number().nullable().optional(),
  targetMax: z.number().nullable().optional(),
  tolerancePercent: z
    .number()
    .min(0, "Tolerance must be at least 0")
    .max(100, "Tolerance must be at most 100")
    .default(10),
  displayOrder: z.number().int().min(0).optional(),
});

function validateTargetFields(
  data: z.infer<typeof metricBaseSchema>,
  ctx: z.RefinementCtx,
) {
  if (data.targetRule === "range") {
    if (data.targetMin === null || data.targetMin === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum target is required for range metrics",
        path: ["targetMin"],
      });
    }
    if (data.targetMax === null || data.targetMax === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "Maximum target is required for range metrics",
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

  if (data.targetRule === "boolean") {
    if (data.targetValue !== 0 && data.targetValue !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Boolean metrics require a target of 0 or 1",
        path: ["targetValue"],
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

export const createMetricSchema = metricBaseSchema.superRefine(validateTargetFields);

export const updateMetricSchema = metricBaseSchema
  .partial()
  .extend({
    metricId: z.string().uuid("Invalid metric"),
    organizationId: z.string().uuid("Invalid organization"),
    archived: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.targetRule !== undefined ||
      data.targetValue !== undefined ||
      data.targetMin !== undefined ||
      data.targetMax !== undefined
    ) {
      validateTargetFields(
        {
          organizationId: data.organizationId,
          ownerId: data.ownerId ?? "00000000-0000-0000-0000-000000000000",
          name: data.name ?? "metric",
          targetRule: data.targetRule ?? "exact",
          targetValue: data.targetValue,
          targetMin: data.targetMin,
          targetMax: data.targetMax,
          tolerancePercent: data.tolerancePercent ?? 10,
          teamId: data.teamId,
          unit: data.unit,
          description: data.description,
          displayOrder: data.displayOrder,
        },
        ctx,
      );
    }
  });

export const upsertValueSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  metricId: z.string().uuid("Invalid metric"),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Period must be a valid date (YYYY-MM-DD)"),
  actual: z.number().nullable(),
  notes: z.string().trim().max(500).nullable().optional(),
  statusOverride: z.enum(["green", "yellow", "red", "na"]).nullable().optional(),
});

export const reorderMetricsSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  orderedMetricIds: z
    .array(z.string().uuid("Invalid metric id"))
    .min(1, "At least one metric is required"),
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type UpdateMetricInput = z.infer<typeof updateMetricSchema>;
export type UpsertValueInput = z.infer<typeof upsertValueSchema>;
export type ReorderMetricsInput = z.infer<typeof reorderMetricsSchema>;
