import { describe, expect, it } from "vitest";
import { toSafeRelativePath } from "@/lib/auth/safe-redirect";

describe("toSafeRelativePath", () => {
  it("allows same-origin relative paths", () => {
    expect(toSafeRelativePath("/org/demo/home", "/onboarding")).toBe("/org/demo/home");
  });

  it("blocks protocol-relative open redirects", () => {
    expect(toSafeRelativePath("//evil.com", "/onboarding")).toBe("/onboarding");
  });

  it("falls back when path is empty", () => {
    expect(toSafeRelativePath(null, "/onboarding")).toBe("/onboarding");
  });
});
