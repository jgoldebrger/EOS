import { z } from "zod";

const meetingTypeSchema = z.enum(["l10", "other"]);
const meetingStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const agendaStepSchema = z.object({
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

export const saveMeetingRatingSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  meetingId: z.string().uuid("Invalid meeting"),
  rating: z.number().int().min(1).max(10),
});

export const l10AgendaDurationsSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  orgSlug: z.string().min(1, "Invalid organization slug"),
  durations: z.object({
    segue: z.number().int().min(1).max(480),
    scorecard: z.number().int().min(1).max(480),
    rocks: z.number().int().min(1).max(480),
    headlines: z.number().int().min(1).max(480),
    todos: z.number().int().min(1).max(480),
    issues: z.number().int().min(1).max(480),
    conclude: z.number().int().min(1).max(480),
  }),
});

export type L10AgendaDurationsInput = z.infer<typeof l10AgendaDurationsSchema>;

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type StartMeetingInput = z.infer<typeof startMeetingSchema>;
export type UpdateActiveSectionInput = z.infer<typeof updateActiveSectionSchema>;
export type SaveNoteInput = z.infer<typeof saveNoteSchema>;
export type CreateDecisionInput = z.infer<typeof createDecisionSchema>;
export type EndMeetingInput = z.infer<typeof endMeetingSchema>;
export type SaveMeetingRatingInput = z.infer<typeof saveMeetingRatingSchema>;
export type AgendaStepInput = z.infer<typeof agendaStepSchema>;

export const saveCascadingMessagesSchema = z.object({
  organizationId: z.string().uuid(),
  meetingId: z.string().uuid(),
  messages: z.array(
    z.object({
      label: z.string().min(1).max(200),
      completed: z.boolean(),
    }),
  ),
});

export const updateSeguePromptsSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  prompts: z.array(z.string().min(1).max(500)).min(1).max(20),
});

export type SaveCascadingMessagesInput = z.infer<typeof saveCascadingMessagesSchema>;
export type UpdateSeguePromptsInput = z.infer<typeof updateSeguePromptsSchema>;
