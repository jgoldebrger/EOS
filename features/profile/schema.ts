import { z } from "zod";

export const updateProfileSchema = z.object({
  orgSlug: z.string().trim().min(1),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
