import { z } from "zod";

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const createOrgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be at most 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50, "Slug must be at most 50 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and hyphens",
    ),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;

/** @deprecated Use inviteOrgMemberSchema from features/people/schema */
export { inviteOrgMemberSchema as inviteSchema } from "@/features/people/schema";
export type { InviteOrgMemberInput as InviteInput } from "@/features/people/schema";
