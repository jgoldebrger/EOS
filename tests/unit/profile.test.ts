import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "@/features/profile/schema";

describe("updateProfileSchema", () => {
  const validInput = {
    orgSlug: "acme",
    firstName: "Jane",
    lastName: "Smith",
  };

  it("accepts valid input", () => {
    const result = updateProfileSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty first name", () => {
    const result = updateProfileSchema.safeParse({
      ...validInput,
      firstName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty last name", () => {
    const result = updateProfileSchema.safeParse({
      ...validInput,
      lastName: "   ",
    });
    expect(result.success).toBe(false);
  });
});
