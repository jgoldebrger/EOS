import type { Tables } from "@/types/database";

export type SsoProviderType = "oauth" | "saml";
export type SsoMappableRole = "admin" | "member" | "viewer";

export type OrganizationSsoSettings = Tables<"organization_sso_settings">;
export type OrganizationSsoRoleMapping = Tables<"organization_sso_role_mappings">;
export type OrganizationVerifiedDomain = Tables<"organization_verified_domains">;

export interface SsoSettingsBundle {
  settings: OrganizationSsoSettings | null;
  roleMappings: OrganizationSsoRoleMapping[];
  verifiedDomains: OrganizationVerifiedDomain[];
}

export interface SsoDiscoveryResult {
  providerName: string;
  providerType: SsoProviderType;
  organizationId: string;
}

export interface SsoActionResult {
  success: boolean;
  error?: string;
}

export interface ValidateSsoMembershipResult {
  success: boolean;
  orgSlug?: string;
  error?: string;
  errorCode?: string;
}
