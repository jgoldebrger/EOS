import { z } from "zod";

export const inviteOrgMemberSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  orgRole: z.enum(["admin", "member", "viewer"]),
  sendEmail: z.boolean().optional().default(false),
});

export type InviteOrgMemberInput = z.infer<typeof inviteOrgMemberSchema>;

export const addOrgMemberSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1).optional(),
  userId: z.string().uuid(),
  orgRole: z.enum(["admin", "member", "viewer"]),
});

export type AddOrgMemberInput = z.infer<typeof addOrgMemberSchema>;

export const addPersonToOrgSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  orgRole: z.enum(["admin", "member", "viewer"]),
});

export type AddPersonToOrgInput = z.infer<typeof addPersonToOrgSchema>;

const authPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const createOrgUserAccountSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: authPasswordSchema,
  orgRole: z.enum(["admin", "member", "viewer"]),
});

export type CreateOrgUserAccountInput = z.infer<typeof createOrgUserAccountSchema>;
