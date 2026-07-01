import { describe, expect, it } from "vitest";
import {
  buildFullName,
  parseNameFromMetadata,
  resolveDisplayName,
} from "@/lib/users/display-name";

describe("buildFullName", () => {
  it("joins first and last name", () => {
    expect(buildFullName("Jane", "Smith")).toBe("Jane Smith");
  });

  it("trims extra whitespace", () => {
    expect(buildFullName(" Jane ", " Smith ")).toBe("Jane Smith");
  });
});

describe("resolveDisplayName", () => {
  const userId = "abcdef12-3456-7890-abcd-ef1234567890";

  it("prefers full_name from metadata", () => {
    expect(
      resolveDisplayName({
        userId,
        email: "jane@acme.com",
        userMetadata: { full_name: "Jane Smith" },
      }),
    ).toBe("Jane Smith");
  });

  it("composes first and last name from metadata", () => {
    expect(
      resolveDisplayName({
        userId,
        email: "jane@acme.com",
        userMetadata: { first_name: "Jane", last_name: "Smith" },
      }),
    ).toBe("Jane Smith");
  });

  it("falls back to email local part", () => {
    expect(
      resolveDisplayName({
        userId,
        email: "jane@acme.com",
      }),
    ).toBe("jane");
  });

  it("falls back to short user id", () => {
    expect(resolveDisplayName({ userId })).toBe("User abcdef12");
  });
});

describe("parseNameFromMetadata", () => {
  it("reads first and last name fields", () => {
    expect(
      parseNameFromMetadata({ first_name: "Jane", last_name: "Smith" }),
    ).toEqual({ firstName: "Jane", lastName: "Smith" });
  });

  it("splits full_name when first/last are missing", () => {
    expect(parseNameFromMetadata({ full_name: "Jane Smith" })).toEqual({
      firstName: "Jane",
      lastName: "Smith",
    });
  });
});
