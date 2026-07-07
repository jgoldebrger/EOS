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
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((value) => value.toLowerCase()),
  password: authPasswordSchema,
  orgRole: z.enum(["admin", "member", "viewer"]),
});

export type CreateOrgUserAccountInput = z.infer<typeof createOrgUserAccountSchema>;

const gwcScoreSchema = z.number().int().min(1).max(5);

const coreValueRatingSchema = z.enum(["+", "+/-", "-"]);

export const upsertPeopleReviewSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  reviewerUserId: z.string().uuid().optional(),
  seatId: z.string().uuid().nullable().optional(),
  getIt: gwcScoreSchema,
  wantIt: gwcScoreSchema,
  capacity: gwcScoreSchema,
  coreValuesScores: z.record(z.string(), coreValueRatingSchema).optional(),
  notes: z.string().max(2000).optional(),
  quarter: z.string().min(1).max(20),
});

export type UpsertPeopleReviewInput = z.infer<typeof upsertPeopleReviewSchema>;

export const updateOrgMemberRoleSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  userId: z.string().uuid(),
  orgRole: z.enum(["admin", "member", "viewer"]),
});

export const removeOrgMemberSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  userId: z.string().uuid(),
});

export const cancelInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  invitationId: z.string().uuid(),
});

export const resendInvitationSchema = z.object({
  organizationId: z.string().uuid(),
  orgSlug: z.string().trim().min(1),
  invitationId: z.string().uuid(),
});

export const acceptInvitationByTokenSchema = z.object({
  token: z.string().trim().min(1),
});
