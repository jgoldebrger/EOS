import { z } from "zod";

const meetingTypeSchema = z.enum(["l10", "other"]);
const meetingStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

const agendaStepSchema = z.object({
  key: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(480),
  required: z.boolean(),
});

export const createMeetingSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  meetingType: meetingTypeSchema.optional(),
});

export const updateMeetingSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters")
    .optional(),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  status: meetingStatusSchema.optional(),
});

export const startMeetingSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
});

export const updateActiveSectionSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
  sectionKey: z.string().min(1, "Section key is required").max(50),
});

export const saveNoteSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
  sectionKey: z.string().min(1, "Section key is required").max(50),
  content: z.string().max(10000, "Note is too long"),
});

export const createDecisionSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be at most 2000 characters")
    .nullable()
    .optional(),
  decidedBy: z.string().uuid("Invalid decider").nullable().optional(),
});

export const endMeetingSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type StartMeetingInput = z.infer<typeof startMeetingSchema>;
export type UpdateActiveSectionInput = z.infer<typeof updateActiveSectionSchema>;
export type SaveNoteInput = z.infer<typeof saveNoteSchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type EndMeetingInput = z.infer<typeof endMeetingSchema>;
export type AgendaStepInput = z.infer<typeof agendaStepSchema>;
