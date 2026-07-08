import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server";
import { z } from "https://esm.sh/zod@3.24.2";
import { checkEdgeRateLimit, clientIpFromRequest, jsonResponse } from "../_shared/edge-utils.ts";

const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

const discoverInputSchema = z
  .object({
    email: z.string().email().optional(),
    domain: z.string().min(1).optional(),
  })
  .refine((value) => value.email || value.domain, {
    message: "Email or domain is required",
  });

function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    return parts[parts.length - 1] ?? trimmed;
  }

  return trimmed.replace(/^\.+|\.+$/g, "");
}

const handler = {
  fetch: withSupabase({ auth: "publishable" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "invalid_input" }, 405);
    }

    const ip = clientIpFromRequest(req);
    if (!checkEdgeRateLimit(`discover-sso:${ip}`, 20, 5 * 60 * 1000)) {
      return jsonResponse({ error: "rate_limited" }, 429);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    const parsed = discoverInputSchema.safeParse(payload);
    if (!parsed.success) {
      return jsonResponse({ error: "invalid_input" }, 400);
    }

    const domain = parsed.data.domain
      ? normalizeDomain(parsed.data.domain)
      : normalizeDomain(parsed.data.email ?? "");

    if (!domain || PUBLIC_DOMAINS.has(domain)) {
      return jsonResponse({ error: "public_domain" }, 400);
    }

    const supabase = ctx.supabaseAdmin;

    const { data: verifiedMatch } = await supabase
      .from("organization_verified_domains")
      .select("organization_id")
      .eq("domain", domain)
      .maybeSingle();

    let organizationId = verifiedMatch?.organization_id ?? null;

    if (!organizationId) {
      const { data: settingsMatch } = await supabase
        .from("organization_sso_settings")
        .select("organization_id")
        .eq("domain", domain)
        .maybeSingle();

      organizationId = settingsMatch?.organization_id ?? null;
    }

    if (!organizationId) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    const { data: settings } = await supabase
      .from("organization_sso_settings")
      .select("provider_name, provider_type, organization_id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!settings) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    return jsonResponse({
      providerName: settings.provider_name,
      providerType: settings.provider_type,
    });
  }),
};

export default handler;
