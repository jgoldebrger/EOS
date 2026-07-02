import { z } from "zod";

export const cascadeSourceTypeSchema = z.enum(["headline", "meeting_message"]);

export const sendCascadesSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  sourceTeamId: z.string().uuid(),
  sourceType: cascadeSourceTypeSchema,
  sourceId: z.string().uuid().nullable().optional(),
  sourceLabel: z.string().trim().min(1).max(500),
  targetTeamIds: z.array(z.string().uuid()).min(1, "Select at least one team"),
});

export const acknowledgeCascadeSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  cascadeId: z.string().uuid(),
  inboxItemId: z.string().uuid().optional(),
});

export type SendCascadesInput = z.infer<typeof sendCascadesSchema>;
export type AcknowledgeCascadeInput = z.infer<typeof acknowledgeCascadeSchema>;
