import { z } from "zod";

export const createHeadlineSchema = z.object({
  organizationId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  headlineType: z.enum(["customer", "employee"]),
  meetingId: z.string().uuid().optional().nullable(),
  isCascading: z.boolean().optional(),
});

export const updateHeadlineSchema = z.object({
  organizationId: z.string().uuid(),
  headlineId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  headlineType: z.enum(["customer", "employee"]).optional(),
  isCascading: z.boolean().optional(),
});

export const archiveHeadlineSchema = z.object({
  organizationId: z.string().uuid(),
  headlineId: z.string().uuid(),
});

export type CreateHeadlineInput = z.infer<typeof createHeadlineSchema>;
export type UpdateHeadlineInput = z.infer<typeof updateHeadlineSchema>;
export type ArchiveHeadlineInput = z.infer<typeof archiveHeadlineSchema>;
