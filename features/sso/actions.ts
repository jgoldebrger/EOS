"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationBySlug } from "@/features/organizations/queries";
import {
  addRoleMappingSchema,
  addVerifiedDomainSchema,
  removeRoleMappingSchema,
  removeVerifiedDomainSchema,
  updateSsoSettingsSchema,
} from "@/features/sso/schema";
import type { SsoActionResult } from "@/features/sso/types";
import { isPublicEmailDomain, normalizeDomain } from "@/features/sso/utils";
import { AUDIT_ACTIONS } from "@/types/domain";
import type { Json } from "@/types/database";

async function requireOwner(orgSlug: string) {
  const org = await getOrganizationBySlug(orgSlug);

  if (!org) {
    return { error: "Organization not found" } as const;
  }

  if (org.role !== "owner") {
    return { error: "Only organization owners can change SSO settings" } as const;
  }

  return { org } as const;
}

async function writeSsoAudit(
  organizationId: string,
  actorId: string,
  action: (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS],
  entityId: string | null,
  metadata: Json,
) {
  const supabase = await createClient();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_id: actorId,
    action,
    entity_type: "sso_connections",
    entity_id: entityId,
    metadata,
  });

  if (error) {
    console.error("SSO audit_logs insert failed:", error.message);
  }
}

export async function updateSsoSettings(input: unknown): Promise<SsoActionResult> {
  const parsed = updateSsoSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid SSO settings",
    };
  }

  const ownerCheck = await requireOwner(parsed.data.orgSlug);
  if ("error" in ownerCheck) {
    return { success: false, error: ownerCheck.error };
  }

  const domain = normalizeDomain(parsed.data.domain);
  if (isPublicEmailDomain(domain)) {
    return {
      success: false,
      error: "Personal email domains cannot be used for enterprise SSO",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const payload = {
    organization_id: ownerCheck.org.id,
    provider_type: parsed.data.providerType,
    provider_name: parsed.data.providerName,
    domain,
    ...(parsed.data.enforced !== undefined && { enforced: parsed.data.enforced }),
    ...(parsed.data.allowEmailPasswordLogin !== undefined && {
      allow_email_password_login: parsed.data.allowEmailPasswordLogin,
    }),
    ...(parsed.data.autoJoinEnabled !== undefined && {
      auto_join_enabled: parsed.data.autoJoinEnabled,
    }),
    ...(parsed.data.defaultOrgRole !== undefined && {
      default_org_role: parsed.data.defaultOrgRole,
    }),
  };

  const { data, error } = await supabase
    .from("organization_sso_settings")
    .upsert(payload, { onConflict: "organization_id" })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Unable to save SSO settings. Please try again." };
  }

  await writeSsoAudit(ownerCheck.org.id, user.id, AUDIT_ACTIONS.UPDATE, data.id, {
    domain,
    provider_type: parsed.data.providerType,
    enforced: parsed.data.enforced,
    auto_join_enabled: parsed.data.autoJoinEnabled,
  });

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}

export async function addRoleMapping(input: unknown): Promise<SsoActionResult> {
  const parsed = addRoleMappingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role mapping",
    };
  }

  const ownerCheck = await requireOwner(parsed.data.orgSlug);
  if ("error" in ownerCheck) {
    return { success: false, error: ownerCheck.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("organization_sso_role_mappings")
    .insert({
      organization_id: ownerCheck.org.id,
      provider_group: parsed.data.providerGroup,
      org_role: parsed.data.orgRole,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This provider group is already mapped" };
    }
    return { success: false, error: "Unable to add role mapping. Please try again." };
  }

  await writeSsoAudit(ownerCheck.org.id, user.id, AUDIT_ACTIONS.CREATE, data.id, {
    provider_group: parsed.data.providerGroup,
    org_role: parsed.data.orgRole,
  });

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}

export async function removeRoleMapping(input: unknown): Promise<SsoActionResult> {
  const parsed = removeRoleMappingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid role mapping",
    };
  }

  const ownerCheck = await requireOwner(parsed.data.orgSlug);
  if ("error" in ownerCheck) {
    return { success: false, error: ownerCheck.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("organization_sso_role_mappings")
    .delete()
    .eq("id", parsed.data.mappingId)
    .eq("organization_id", ownerCheck.org.id);

  if (error) {
    return { success: false, error: "Unable to remove role mapping. Please try again." };
  }

  await writeSsoAudit(ownerCheck.org.id, user.id, AUDIT_ACTIONS.DELETE, parsed.data.mappingId, {});

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}

export async function addVerifiedDomain(input: unknown): Promise<SsoActionResult> {
  const parsed = addVerifiedDomainSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid domain",
    };
  }

  const ownerCheck = await requireOwner(parsed.data.orgSlug);
  if ("error" in ownerCheck) {
    return { success: false, error: ownerCheck.error };
  }

  const domain = normalizeDomain(parsed.data.domain);
  if (isPublicEmailDomain(domain)) {
    return {
      success: false,
      error: "Personal email domains cannot be verified for enterprise SSO",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { data, error } = await supabase
    .from("organization_verified_domains")
    .insert({
      organization_id: ownerCheck.org.id,
      domain,
      verification_method: parsed.data.verificationMethod,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This domain is already verified" };
    }
    return { success: false, error: "Unable to verify domain. Please try again." };
  }

  await writeSsoAudit(ownerCheck.org.id, user.id, AUDIT_ACTIONS.CREATE, data.id, {
    domain,
    verification_method: parsed.data.verificationMethod,
  });

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}

export async function removeVerifiedDomain(input: unknown): Promise<SsoActionResult> {
  const parsed = removeVerifiedDomainSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid domain",
    };
  }

  const ownerCheck = await requireOwner(parsed.data.orgSlug);
  if ("error" in ownerCheck) {
    return { success: false, error: ownerCheck.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in" };
  }

  const { error } = await supabase
    .from("organization_verified_domains")
    .delete()
    .eq("id", parsed.data.domainId)
    .eq("organization_id", ownerCheck.org.id);

  if (error) {
    return { success: false, error: "Unable to remove verified domain. Please try again." };
  }

  await writeSsoAudit(ownerCheck.org.id, user.id, AUDIT_ACTIONS.DELETE, parsed.data.domainId, {});

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}
