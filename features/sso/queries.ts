import { createClient } from "@/lib/supabase/server";
import type { SsoSettingsBundle } from "@/features/sso/types";

export async function getSsoSettings(orgId: string): Promise<SsoSettingsBundle> {
  const supabase = await createClient();

  const [settingsResult, mappingsResult, domainsResult] = await Promise.all([
    supabase
      .from("organization_sso_settings")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle(),
    supabase
      .from("organization_sso_role_mappings")
      .select("*")
      .eq("organization_id", orgId)
      .order("provider_group", { ascending: true }),
    supabase
      .from("organization_verified_domains")
      .select("*")
      .eq("organization_id", orgId)
      .order("domain", { ascending: true }),
  ]);

  return {
    settings: settingsResult.data ?? null,
    roleMappings: mappingsResult.data ?? [],
    verifiedDomains: domainsResult.data ?? [],
  };
}

export async function getRoleMappings(orgId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_sso_role_mappings")
    .select("*")
    .eq("organization_id", orgId)
    .order("provider_group", { ascending: true });

  if (error) {
    return [];
  }

  return data;
}
