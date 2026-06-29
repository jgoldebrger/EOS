import { describe, expect, it } from "vitest";
import {
  evaluateMetricStatus,
  formatOwnerLabel,
  formatWeekLabel,
  getLastNWeeks,
  getWeekStart,
} from "@/features/scorecard/utils";
import {
  createMetricSchema,
  upsertValueSchema,
} from "@/features/scorecard/schema";

describe("getWeekStart", () => {
  it("returns Monday for a mid-week date", () => {
    expect(getWeekStart(new Date(2026, 5, 25))).toBe("2026-06-22");
  });

  it("returns same Monday when date is already Monday", () => {
    expect(getWeekStart(new Date(2026, 5, 22))).toBe("2026-06-22");
  });

  it("rolls Sunday back to prior Monday", () => {
    expect(getWeekStart(new Date(2026, 5, 28))).toBe("2026-06-22");
  });
});

describe("getLastNWeeks", () => {
  it("returns n week-start dates ending at the anchor week", () => {
    const weeks = getLastNWeeks(3, new Date(2026, 5, 25));
    expect(weeks).toHaveLength(3);
    expect(weeks[2]).toBe("2026-06-22");
    expect(weeks[0]).toBe("2026-06-08");
  });
});

describe("evaluateMetricStatus", () => {
  it("returns na when actual is missing", () => {
    expect(evaluateMetricStatus("higher_is_better", null, 100)).toBe("na");
  });

  it("marks higher-is-better metrics green at target", () => {
    expect(evaluateMetricStatus("higher_is_better", 120, 100, 10)).toBe("green");
  });

  it("marks higher-is-better metrics yellow within tolerance", () => {
    expect(evaluateMetricStatus("higher_is_better", 95, 100, 10)).toBe("yellow");
  });

  it("marks higher-is-better metrics red below tolerance band", () => {
    expect(evaluateMetricStatus("higher_is_better", 80, 100, 10)).toBe("red");
  });

  it("marks lower-is-better metrics green at target", () => {
    expect(evaluateMetricStatus("lower_is_better", 8, 10, 10)).toBe("green");
  });

  it("marks range metrics green inside bounds", () => {
    expect(
      evaluateMetricStatus("range", 50, null, 10, { min: 40, max: 60 }),
    ).toBe("green");
  });

  it("marks boolean metrics by exact match", () => {
    expect(evaluateMetricStatus("boolean", 1, 1)).toBe("green");
    expect(evaluateMetricStatus("boolean", 0, 1)).toBe("red");
  });
});

describe("formatOwnerLabel", () => {
  it("uses email local part when available", () => {
    expect(formatOwnerLabel("user-id", "jane@acme.com")).toBe("jane");
  });

  it("falls back to short user id", () => {
    expect(formatOwnerLabel("abcdef12-3456-7890-abcd-ef1234567890")).toBe(
      "User abcdef12",
    );
  });
});

describe("formatWeekLabel", () => {
  it("formats ISO dates for column headers", () => {
    expect(formatWeekLabel("2026-06-22")).toMatch(/Jun/);
  });
});

describe("createMetricSchema", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440001";
  const ownerId = "550e8400-e29b-41d4-a716-446655440002";

  it("requires target value for non-range metrics", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Revenue",
      targetRule: "higher_is_better",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid range metrics", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Utilization",
      targetRule: "range",
      targetMin: 40,
      targetMax: 60,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(true);
  });
});

describe("upsertValueSchema", () => {
  it("accepts nullable actual values", () => {
    const result = upsertValueSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440001",
      metricId: "550e8400-e29b-41d4-a716-446655440003",
      periodStart: "2026-06-22",
      actual: null,
    });

    expect(result.success).toBe(true);
  });
});
