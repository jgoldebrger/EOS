import { z } from "zod";

const dayOfWeekSchema = z.number().int().min(0).max(6);

export const upsertMeetingScheduleSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  teamId: z.string().uuid(),
  teamSlug: z.string().min(1),
  dayOfWeek: dayOfWeekSchema,
  timeLocal: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  timezone: z.string().min(1).max(64),
  reminderHoursBefore: z.number().int().min(1).max(168),
  enabled: z.boolean(),
});

export const deleteMeetingScheduleSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().min(1),
  teamId: z.string().uuid(),
  teamSlug: z.string().min(1),
});

export type UpsertMeetingScheduleInput = z.infer<typeof upsertMeetingScheduleSchema>;
