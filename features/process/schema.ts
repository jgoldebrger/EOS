import { z } from "zod";

export const sopStepSchema = z.object({
  title: z.string(),
  time: z.string(),
  note: z.string(),
  dependencies: z.array(z.number()).default([]),
  imageUrl: z.string().default(""),
  approver: z.string().default(""),
  approvalStatus: z.string().default("pending"),
});

export const sopDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  department: z.string().default("General"),
  priority: z.string().default("Medium"),
  steps: z.array(sopStepSchema).default([]),
  lastModified: z.string().optional(),
});

export const createProcessPageSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  teamId: z.string().uuid().nullable().optional(),
  teamSlug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200).default("New SOP"),
});

export const updateProcessPageSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  teamId: z.string().uuid().nullable().optional(),
  teamSlug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  contentMarkdown: z.string().max(500_000).optional(),
  sopDocument: sopDocumentSchema.optional(),
});

export const deleteProcessPageSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  teamId: z.string().uuid().nullable().optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export type SopDocument = z.infer<typeof sopDocumentSchema>;
export type CreateProcessPageInput = z.infer<typeof createProcessPageSchema>;
export type UpdateProcessPageInput = z.infer<typeof updateProcessPageSchema>;
