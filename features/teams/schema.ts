import { z } from "zod";
import { slugifyName } from "@/features/organizations/schema";

export const createTeamSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name must be at most 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export function teamSlugFromName(name: string): string {
  return slugifyName(name);
}
