const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (trimmed.includes("@")) {
    const parts = trimmed.split("@");
    return parts[parts.length - 1] ?? trimmed;
  }

  return trimmed.replace(/^\.+|\.+$/g, "");
}

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(normalizeDomain(domain));
}

export function extractDomainFromEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  return normalizeDomain(normalized.slice(atIndex + 1));
}

export function formatSsoError(code: string): string {
  const messages: Record<string, string> = {
    invalid_input: "Enter a valid work email or company domain.",
    public_domain: "Personal email domains cannot use enterprise SSO.",
    not_found: "No SSO configuration was found for this domain.",
    unauthorized: "You must be signed in to continue.",
    access_denied: "You do not have access to this organization.",
    auto_join_disabled: "Automatic access is not enabled for your organization.",
    domain_unverified: "Your email domain has not been verified for this organization.",
    configuration_error: "SSO is not fully configured. Contact your administrator.",
  };

  return messages[code] ?? "Something went wrong with SSO. Please try again.";
}

export function resolveMappedRole(
  defaultRole: "admin" | "member" | "viewer",
  providerGroups: string[],
  mappings: Array<{ provider_group: string; org_role: "admin" | "member" | "viewer" }>,
): "admin" | "member" | "viewer" {
  const roleRank: Record<"admin" | "member" | "viewer", number> = {
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
