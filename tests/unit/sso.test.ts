import { describe, expect, it } from "vitest";
import {
  extractDomainFromEmail,
  formatSsoError,
  isPublicEmailDomain,
  normalizeDomain,
  resolveMappedRole,
} from "@/features/sso/utils";
import {
  addRoleMappingSchema,
  discoverSsoInputSchema,
  updateSsoSettingsSchema,
} from "@/features/sso/schema";

describe("normalizeDomain", () => {
  it("lowercases and trims domains", () => {
    expect(normalizeDomain("  Example.COM ")).toBe("example.com");
  });

  it("extracts domain from email addresses", () => {
    expect(normalizeDomain("User@Acme.Corp")).toBe("acme.corp");
  });
});

describe("isPublicEmailDomain", () => {
  it("blocks common public providers", () => {
    expect(isPublicEmailDomain("gmail.com")).toBe(true);
    expect(isPublicEmailDomain("user@gmail.com")).toBe(true);
  });

  it("allows corporate domains", () => {
    expect(isPublicEmailDomain("acme.com")).toBe(false);
  });
});

describe("extractDomainFromEmail", () => {
  it("returns null for invalid emails", () => {
    expect(extractDomainFromEmail("not-an-email")).toBeNull();
  });

  it("extracts domain from valid emails", () => {
    expect(extractDomainFromEmail("user@company.com")).toBe("company.com");
  });
});

describe("formatSsoError", () => {
  it("returns safe messages for known codes", () => {
    expect(formatSsoError("not_found")).toContain("No SSO configuration");
  });

  it("returns generic message for unknown codes", () => {
    expect(formatSsoError("unknown_code")).toContain("Something went wrong");
  });
});

describe("resolveMappedRole", () => {
  it("never assigns owner and picks highest mapped role", () => {
    const role = resolveMappedRole("viewer", ["Engineering", "Admins"], [
      { provider_group: "Engineering", org_role: "member" },
      { provider_group: "Admins", org_role: "admin" },
    ]);

    expect(role).toBe("admin");
  });

  it("falls back to default role when no groups match", () => {
    expect(resolveMappedRole("member", [], [])).toBe("member");
  });
});

describe("discoverSsoInputSchema", () => {
  it("requires email or domain", () => {
    expect(discoverSsoInputSchema.safeParse({}).success).toBe(false);
    expect(discoverSsoInputSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(discoverSsoInputSchema.safeParse({ domain: "b.com" }).success).toBe(true);
  });
});

describe("updateSsoSettingsSchema", () => {
  it("validates provider and domain fields", () => {
    const result = updateSsoSettingsSchema.safeParse({
      orgSlug: "acme",
      providerType: "oauth",
      providerName: "Okta",
      domain: "acme.com",
    });

    expect(result.success).toBe(true);
  });
});

describe("addRoleMappingSchema", () => {
  it("rejects owner role via enum", () => {
    const result = addRoleMappingSchema.safeParse({
      orgSlug: "acme",
      providerGroup: "Admins",
      orgRole: "owner",
    });

    expect(result.success).toBe(false);
  });
});
