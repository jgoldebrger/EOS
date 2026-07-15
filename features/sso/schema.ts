import { z } from "zod";

export const ssoProviderTypeSchema = z.enum(["oauth", "saml"]);
export const ssoMappableRoleSchema = z.enum(["admin", "member", "viewer"]);

export const discoverSsoInputSchema = z
  .object({
    email: z.string().email().optional(),
    domain: z.string().min(1).optional(),
  })
  .refine((value) => value.email || value.domain, {
    message: "Email or domain is required",
  });

export const updateSsoSettingsSchema = z.object({
  orgSlug: z.string().min(1),
  providerType: ssoProviderTypeSchema,
  providerName: z.string().trim().min(1, "Provider name is required").max(100),
  domain: z
    .string()
    .trim()
    .min(3, "Domain is required")
    .max(253)
    .regex(/^[a-z0-9]+([.-][a-z0-9]+)*\.[a-z]{2,}$/i, "Enter a valid domain"),
  enforced: z.boolean().optional(),
  allowEmailPasswordLogin: z.boolean().optional(),
  autoJoinEnabled: z.boolean().optional(),
  defaultOrgRole: ssoMappableRoleSchema.optional(),
});

export const addRoleMappingSchema = z.object({
  orgSlug: z.string().min(1),
  providerGroup: z.string().trim().min(1, "Provider group is required").max(200),
  orgRole: ssoMappableRoleSchema,
});

export const removeRoleMappingSchema = z.object({
  orgSlug: z.string().min(1),
  mappingId: z.string().uuid(),
});

export const addVerifiedDomainSchema = z.object({
  orgSlug: z.string().min(1),
  domain: z
    .string()
    .trim()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9]+([.-][a-z0-9]+)*\.[a-z]{2,}$/i, "Enter a valid domain"),
});

export const confirmVerifiedDomainSchema = z.object({
  orgSlug: z.string().min(1),
  domainId: z.string().uuid(),
});

export const removeVerifiedDomainSchema = z.object({
  orgSlug: z.string().min(1),
  domainId: z.string().uuid(),
});

export const validateSsoMembershipSchema = z.object({
  organizationId: z.string().uuid(),
});

export type DiscoverSsoInput = z.infer<typeof discoverSsoInputSchema>;
export type UpdateSsoSettingsInput = z.infer<typeof updateSsoSettingsSchema>;
export type AddRoleMappingInput = z.infer<typeof addRoleMappingSchema>;
export type AddVerifiedDomainInput = z.infer<typeof addVerifiedDomainSchema>;
export type ConfirmVerifiedDomainInput = z.infer<typeof confirmVerifiedDomainSchema>;
