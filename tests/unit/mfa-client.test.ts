import { describe, expect, it } from "vitest";
import { pickVerifiedTotpFactor, type AppSupabaseClient } from "@/lib/auth/mfa-client";

type FactorsData = Awaited<
  ReturnType<AppSupabaseClient["auth"]["mfa"]["listFactors"]>
>["data"];

describe("pickVerifiedTotpFactor", () => {
  it("returns the verified TOTP factor", () => {
    const factors = {
      totp: [
        { id: "a", friendly_name: "Pending", status: "unverified" },
        { id: "b", friendly_name: "App", status: "verified" },
      ],
    } as unknown as FactorsData;

    const factor = pickVerifiedTotpFactor(factors);

    expect(factor?.id).toBe("b");
    expect(factor?.friendlyName).toBe("App");
  });

  it("returns null when no verified factor exists", () => {
    const factors = {
      totp: [{ id: "a", friendly_name: "Pending", status: "unverified" }],
    } as unknown as FactorsData;

    expect(pickVerifiedTotpFactor(factors)).toBeNull();
  });
});
