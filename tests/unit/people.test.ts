import { describe, expect, it } from "vitest";
import { createOrgUserAccountSchema } from "@/features/people/schema";

describe("createOrgUserAccountSchema", () => {
  const validInput = {
    organizationId: "550e8400-e29b-41d4-a716-446655440000",
    orgSlug: "acme",
    firstName: "Jane",
    lastName: "Smith",
    email: "User@Company.com",
    password: "securepass",
    orgRole: "member" as const,
  };

  it("accepts valid input and normalizes email", () => {
    const result = createOrgUserAccountSchema.safeParse(validInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@company.com");
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = createOrgUserAccountSchema.safeParse({
      ...validInput,
      password: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing first name", () => {
    const result = createOrgUserAccountSchema.safeParse({
      ...validInput,
      firstName: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects owner role", () => {
    const result = createOrgUserAccountSchema.safeParse({
      ...validInput,
      orgRole: "owner",
    });

    expect(result.success).toBe(false);
  });
});
