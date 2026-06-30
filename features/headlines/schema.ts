import { z } from "zod";

export const createHeadlineSchema = z.object({
  organizationId: z.string().uuid(),
  teamId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  headlineType: z.enum(["customer", "employee"]),
});

export type CreateHeadlineInput = z.infer<typeof createHeadlineSchema>;
