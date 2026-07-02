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

const processPageScopeSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  teamId: z.string().uuid().nullable().optional(),
  teamSlug: z.string().trim().min(1).optional(),
});

export const createProcessPageSchema = processPageScopeSchema.extend({
  title: z.string().trim().min(1).max(200).default("New SOP"),
  category: z.string().trim().min(1).max(100).default("General").optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateProcessPageSchema = processPageScopeSchema.extend({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
  accountabilitySeatId: z.string().uuid().nullable().optional(),
  contentMarkdown: z.string().max(500_000).optional(),
  sopDocument: sopDocumentSchema.optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const deleteProcessPageSchema = processPageScopeSchema.extend({
  id: z.string().uuid(),
});

export const restoreProcessPageVersionSchema = processPageScopeSchema.extend({
  pageId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const setProcessPageTagsSchema = processPageScopeSchema.extend({
  pageId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()),
});

export const archiveProcessPageSchema = processPageScopeSchema.extend({
  id: z.string().uuid(),
  archived: z.boolean(),
});

export type SopDocument = z.infer<typeof sopDocumentSchema>;
export type CreateProcessPageInput = z.infer<typeof createProcessPageSchema>;
export type UpdateProcessPageInput = z.infer<typeof updateProcessPageSchema>;
export type RestoreProcessPageVersionInput = z.infer<
  typeof restoreProcessPageVersionSchema
>;
export type SetProcessPageTagsInput = z.infer<typeof setProcessPageTagsSchema>;
export type ArchiveProcessPageInput = z.infer<typeof archiveProcessPageSchema>;
