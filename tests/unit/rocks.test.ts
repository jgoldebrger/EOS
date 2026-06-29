import { describe, expect, it } from "vitest";
import {
  createRockSchema,
  updateRockSchema,
  updateRockStatusSchema,
} from "@/features/rocks/schema";
import {
  formatQuarterLabel,
  getAtRiskReason,
  getCurrentQuarter,
  isRockAtRisk,
  isValidQuarter,
} from "@/features/rocks/utils";

describe("getCurrentQuarter", () => {
  it("returns Q2 for June", () => {
    expect(getCurrentQuarter(new Date(2026, 5, 15))).toBe("2026-Q2");
  });

  it("returns Q4 for December", () => {
    expect(getCurrentQuarter(new Date(2026, 11, 1))).toBe("2026-Q4");
  });
});

describe("isValidQuarter", () => {
  it("accepts valid quarter strings", () => {
    expect(isValidQuarter("2026-Q2")).toBe(true);
  });

  it("rejects invalid quarter strings", () => {
    expect(isValidQuarter("2026-Q5")).toBe(false);
    expect(isValidQuarter("Q2-2026")).toBe(false);
  });
});

describe("formatQuarterLabel", () => {
  it("formats quarter for display", () => {
    expect(formatQuarterLabel("2026-Q2")).toBe("Q2 2026");
  });
});

describe("isRockAtRisk", () => {
  it("flags off_track rocks", () => {
    expect(
      isRockAtRisk({ status: "off_track", confidence: 8, due_date: null }),
    ).toBe(true);
  });

  it("flags low confidence", () => {
    expect(
      isRockAtRisk({ status: "on_track", confidence: 3, due_date: null }),
    ).toBe(true);
  });

  it("flags due soon rocks", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const dueDate = soon.toISOString().slice(0, 10);

    expect(
      isRockAtRisk({ status: "on_track", confidence: 8, due_date: dueDate }),
    ).toBe(true);
  });

  it("does not flag healthy rocks", () => {
    expect(
      isRockAtRisk({ status: "on_track", confidence: 8, due_date: null }),
    ).toBe(false);
  });
});

describe("getAtRiskReason", () => {
  it("returns off track reason", () => {
    expect(
      getAtRiskReason({ status: "off_track", confidence: null, due_date: null }),
    ).toBe("Off track");
  });
});

describe("createRockSchema", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440001";
  const ownerId = "550e8400-e29b-41d4-a716-446655440002";

  it("requires title and quarter", () => {
    const result = createRockSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "",
      quarter: "2026-Q2",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid rock input", () => {
    const result = createRockSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "Launch product",
      quarter: "2026-Q2",
      progress: 25,
      confidence: 7,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid quarter format", () => {
    const result = createRockSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "Launch product",
      quarter: "Q2 2026",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateRockSchema", () => {
  it("allows partial updates", () => {
    const result = updateRockSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      rockId: "550e8400-e29b-41d4-a716-446655440003",
      progress: 50,
    });

    expect(result.success).toBe(true);
  });
});

describe("updateRockStatusSchema", () => {
  it("requires status", () => {
    const result = updateRockStatusSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      rockId: "550e8400-e29b-41d4-a716-446655440003",
    });

    expect(result.success).toBe(false);
  });

  it("accepts status with optional progress", () => {
    const result = updateRockStatusSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      rockId: "550e8400-e29b-41d4-a716-446655440003",
      status: "done",
      progress: 100,
    });

    expect(result.success).toBe(true);
  });
});
