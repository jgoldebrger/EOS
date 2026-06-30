import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "https://esm.sh/zod@3.24.2";
import { jsonResponse } from "../_shared/edge-utils.ts";

const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

const validateInputSchema = z.object({
  organizationId: z.string().uuid(),
  providerGroups: z.array(z.string()).optional(),
});

function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    return parts[parts.length - 1] ?? trimmed;
  }

  return trimmed.replace(/^\.+|\.+$/g, "");
}

function extractEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  return normalizeDomain(normalized.slice(atIndex + 1));
}

type MappableRole = "admin" | "member" | "viewer";

function resolveMappedRole(
  defaultRole: MappableRole,
  providerGroups: string[],
  mappings: Array<{ provider_group: string; org_role: MappableRole }>,
): MappableRole {
  const roleRank: Record<MappableRole, number> = {
    admin: 3,
    member: 2,
    viewer: 1,
  };

  let resolved = defaultRole;

  for (const mapping of mappings) {
    if (!providerGroups.includes(mapping.provider_group)) {
      continue;
    }

    if (roleRank[mapping.org_role] > roleRank[resolved]) {
      resolved = mapping.org_role;
    }
  }

  return resolved;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "invalid_input", success: false }, 405);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_input", success: false }, 400);
    }

    const parsed = validateInputSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_input", success: false }, 400);
    }

    const email = ctx.userClaims?.email;
    const userId = ctx.userClaims?.id;

    if (!userId || !email) {
      return jsonResponse({ error: "unauthorized", success: false }, 401);
    }

    const adminClient = ctx.supabaseAdmin;
    const { organizationId, providerGroups = [] } = parsed.data;

    const { data: org } = await adminClient
      .from("organizations")
      .select("id, slug")
      .eq("id", organizationId)
      .maybeSingle();

    if (!org) {
      return jsonResponse({ error: "not_found", success: false }, 404);
    }

    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("org_role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMember) {
      return jsonResponse({ success: true, orgSlug: org.slug });
    }

    const emailDomain = extractEmailDomain(email);
    if (!emailDomain || PUBLIC_DOMAINS.has(emailDomain)) {
      return jsonResponse({ error: "public_domain", success: false }, 403);
    }

    const [{ data: settings }, { data: verifiedDomain }, { data: mappings }] =
      await Promise.all([
        adminClient
          .from("organization_sso_settings")
          .select("auto_join_enabled, default_org_role")
          .eq("organization_id", organizationId)
          .maybeSingle(),
        adminClient
          .from("organization_verified_domains")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("domain", emailDomain)
          .maybeSingle(),
        adminClient
          .from("organization_sso_role_mappings")
          .select("provider_group, org_role")
          .eq("organization_id", organizationId),
      ]);

    if (!settings?.auto_join_enabled) {
      return jsonResponse({ error: "auto_join_disabled", success: false }, 403);
    }

    if (!verifiedDomain) {
      return jsonResponse({ error: "domain_unverified", success: false }, 403);
    }

    const assignedRole = resolveMappedRole(
      settings.default_org_role as MappableRole,
      providerGroups,
      mappings ?? [],
    );

    const { error: insertError } = await adminClient.from("organization_members").insert({
      organization_id: organizationId,
      user_id: userId,
      org_role: assignedRole,
      created_by: userId,
    });

    if (insertError) {
      return jsonResponse({ error: "access_denied", success: false }, 403);
    }

    return jsonResponse({ success: true, orgSlug: org.slug });
  }),
};
