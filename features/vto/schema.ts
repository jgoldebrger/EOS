import { z } from "zod";

const organizationId = z.string().uuid("Invalid organization");
const sectionId = z.string().uuid("Invalid section");
const snapshotId = z.string().uuid("Invalid snapshot");

export const updateSectionSchema = z
  .object({
    organizationId,
    sectionId,
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(200, "Title must be at most 200 characters")
      .optional(),
    content: z.string().max(50000, "Content is too long").optional(),
    visible: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.visible !== undefined,
    { message: "At least one field must be updated" },
  );

export const toggleSectionVisibilitySchema = z.object({
  organizationId,
  sectionId,
  visible: z.boolean(),
});

export const createSnapshotSchema = z.object({
  organizationId,
});

export const restoreSnapshotSchema = z.object({
  organizationId,
  snapshotId,
});

export const bootstrapVtoSchema = z.object({
  organizationId,
});

export const pinVtoLinkSchema = z.object({
  organizationId,
  entityType: z.enum(["rock", "issue", "metric"]),
  entityId: z.string().uuid(),
  sectionKey: z.string().min(1).max(100),
});

export const unpinVtoLinkSchema = z.object({
  organizationId,
  linkId: z.string().uuid(),
});

export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ToggleSectionVisibilityInput = z.infer<
  typeof toggleSectionVisibilitySchema
>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
export type RestoreSnapshotInput = z.infer<typeof restoreSnapshotSchema>;
export type BootstrapVtoInput = z.infer<typeof bootstrapVtoSchema>;
export type PinVtoLinkInput = z.infer<typeof pinVtoLinkSchema>;
export type UnpinVtoLinkInput = z.infer<typeof unpinVtoLinkSchema>;
