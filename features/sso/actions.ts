"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePrivilegedSession } from "@/lib/auth/privileged-session";
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
import { logAuditEvent } from "@/lib/audit";

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

  await logAuditEvent(supabase, {
    organizationId,
    actorId,
    action,
    entityType: "sso_connections",
    entityId: entityId ?? organizationId,
    metadata,
  });
}

async function requireOwnerActor(orgSlug: string) {
  const ownerCheck = await requireOwner(orgSlug);
  if ("error" in ownerCheck) {
    return { error: ownerCheck.error } as const;
  }

  const session = await requirePrivilegedSession();
  if ("error" in session) {
    return { error: session.error } as const;
  }

  return {
    org: ownerCheck.org,
    userId: session.userId,
    supabase: await createClient(),
  } as const;
}

export async function updateSsoSettings(input: unknown): Promise<SsoActionResult> {
  const parsed = updateSsoSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid SSO settings",
    };
  }

  const ownerActor = await requireOwnerActor(parsed.data.orgSlug);
  if ("error" in ownerActor) {
    return { success: false, error: ownerActor.error };
  }

  const domain = normalizeDomain(parsed.data.domain);
  if (isPublicEmailDomain(domain)) {
    return {
      success: false,
      error: "Personal email domains cannot be used for enterprise SSO",
    };
  }

  const { org, userId, supabase } = ownerActor;

  const payload = {
    organization_id: org.id,
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

  await writeSsoAudit(org.id, userId, AUDIT_ACTIONS.UPDATE, data.id, {
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

  const ownerActor = await requireOwnerActor(parsed.data.orgSlug);
  if ("error" in ownerActor) {
    return { success: false, error: ownerActor.error };
  }

  const { org, userId, supabase } = ownerActor;

  const { data, error } = await supabase
    .from("organization_sso_role_mappings")
    .insert({
      organization_id: org.id,
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

  await writeSsoAudit(org.id, userId, AUDIT_ACTIONS.CREATE, data.id, {
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

  const ownerActor = await requireOwnerActor(parsed.data.orgSlug);
  if ("error" in ownerActor) {
    return { success: false, error: ownerActor.error };
  }

  const { org, userId, supabase } = ownerActor;

  const { error } = await supabase
    .from("organization_sso_role_mappings")
    .delete()
    .eq("id", parsed.data.mappingId)
    .eq("organization_id", org.id);

  if (error) {
    return { success: false, error: "Unable to remove role mapping. Please try again." };
  }

  await writeSsoAudit(org.id, userId, AUDIT_ACTIONS.DELETE, parsed.data.mappingId, {});

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

  const ownerActor = await requireOwnerActor(parsed.data.orgSlug);
  if ("error" in ownerActor) {
    return { success: false, error: ownerActor.error };
  }

  const domain = normalizeDomain(parsed.data.domain);
  if (isPublicEmailDomain(domain)) {
    return {
      success: false,
      error: "Personal email domains cannot be verified for enterprise SSO",
    };
  }

  const { org, userId, supabase } = ownerActor;

  const { data, error } = await supabase
    .from("organization_verified_domains")
    .insert({
      organization_id: org.id,
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

  await writeSsoAudit(org.id, userId, AUDIT_ACTIONS.CREATE, data.id, {
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

  const ownerActor = await requireOwnerActor(parsed.data.orgSlug);
  if ("error" in ownerActor) {
    return { success: false, error: ownerActor.error };
  }

  const { org, userId, supabase } = ownerActor;

  const { error } = await supabase
    .from("organization_verified_domains")
    .delete()
    .eq("id", parsed.data.domainId)
    .eq("organization_id", org.id);

  if (error) {
    return { success: false, error: "Unable to remove verified domain. Please try again." };
  }

  await writeSsoAudit(org.id, userId, AUDIT_ACTIONS.DELETE, parsed.data.domainId, {});

  revalidatePath(`/org/${parsed.data.orgSlug}/settings/security/sso`);
  return { success: true };
}
