import { z } from "zod";
import { initialMilestoneSchema } from "@/features/rocks/milestone-schema";

const quarterSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-Q[1-4]$/, 'Quarter must be in format "YYYY-Q#" (e.g. 2026-Q2)');

const rockStatusSchema = z.enum(["on_track", "off_track", "done", "dropped"]);
const rockTypeSchema = z.enum(["company", "team", "individual"]);

const rockBaseSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  ownerId: z.string().uuid("Invalid owner"),
  quarter: quarterSchema,
  status: rockStatusSchema.optional(),
  confidence: z
    .number()
    .int()
    .min(1, "Confidence must be at least 1")
    .max(10, "Confidence must be at most 10")
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  successDefinition: z.string().trim().max(1000).nullable().optional(),
  progress: z
    .number()
    .int()
    .min(0, "Progress must be at least 0")
    .max(100, "Progress must be at most 100")
    .optional(),
  rockType: rockTypeSchema.optional(),
  initialMilestones: z.array(initialMilestoneSchema).max(20).optional(),
});

export const createRockSchema = rockBaseSchema;

export const updateRockSchema = rockBaseSchema
  .partial()
  .extend({
    rockId: z.string().uuid("Invalid rock"),
    organizationId: z.string().uuid("Invalid organization"),
  });

export const updateRockStatusSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  rockId: z.string().uuid("Invalid rock"),
  status: rockStatusSchema,
  progress: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  confidence: z
    .number()
    .int()
    .min(1)
    .max(10)
    .nullable()
    .optional(),
});

export const archiveRockSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  rockId: z.string().uuid("Invalid rock"),
});

export type CreateRockInput = z.infer<typeof createRockSchema>;
export type UpdateRockInput = z.infer<typeof updateRockSchema>;
export type UpdateRockStatusInput = z.infer<typeof updateRockStatusSchema>;
export type ArchiveRockInput = z.infer<typeof archiveRockSchema>;
