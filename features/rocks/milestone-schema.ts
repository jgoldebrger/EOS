import { z } from "zod";

const milestoneBaseSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  rockId: z.string().uuid("Invalid rock"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD")
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createRockMilestoneSchema = milestoneBaseSchema;

export const updateRockMilestoneSchema = milestoneBaseSchema
  .partial()
  .extend({
    milestoneId: z.string().uuid("Invalid milestone"),
    organizationId: z.string().uuid("Invalid organization"),
    rockId: z.string().uuid("Invalid rock"),
  });

export const completeRockMilestoneSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  rockId: z.string().uuid("Invalid rock"),
  milestoneId: z.string().uuid("Invalid milestone"),
  completed: z.boolean(),
});

export const deleteRockMilestoneSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  rockId: z.string().uuid("Invalid rock"),
  milestoneId: z.string().uuid("Invalid milestone"),
});

export const initialMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export type CreateRockMilestoneInput = z.infer<typeof createRockMilestoneSchema>;
export type UpdateRockMilestoneInput = z.infer<typeof updateRockMilestoneSchema>;
export type CompleteRockMilestoneInput = z.infer<typeof completeRockMilestoneSchema>;
export type DeleteRockMilestoneInput = z.infer<typeof deleteRockMilestoneSchema>;
export type InitialMilestoneInput = z.infer<typeof initialMilestoneSchema>;
