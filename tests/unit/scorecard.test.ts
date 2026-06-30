import { describe, expect, it } from "vitest";
import {
  deriveTargetRule,
  evaluateMetricForRow,
  evaluateMetricStatus,
  evaluateMetricStatusByOperator,
  formatDisplayTarget,
  formatDisplayTargetFromOperator,
  formatMetricValue,
  parseTimeInput,
  parseDurationTimeInput,
  parseClockTimeInput,
  minutesToTimeInput,
  clockTimeToInput,
  formatClockTime,
  parseMetricInputValue,
  metricValueToInput,
  formatOwnerLabel,
  formatWeekLabel,
  getDatesInWeek,
  getLastNWeeks,
  getPeriodColumns,
  getWeekStart,
  rollupDailyValues,
} from "@/features/scorecard/utils";
import {
  createMetricSchema,
  updateMetricSchema,
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

describe("rollupDailyValues", () => {
  it("returns null for empty arrays", () => {
    expect(rollupDailyValues([], "sum")).toBeNull();
  });

  it("sums daily values", () => {
    expect(rollupDailyValues([10, 20, 5], "sum")).toBe(35);
  });

  it("averages daily values", () => {
    expect(rollupDailyValues([10, 20], "average")).toBe(15);
  });

  it("uses last daily value", () => {
    expect(rollupDailyValues([10, 20, 5], "last")).toBe(5);
  });

  it("finds min and max", () => {
    expect(rollupDailyValues([10, 3, 7], "min")).toBe(3);
    expect(rollupDailyValues([10, 3, 7], "max")).toBe(10);
  });

  it("counts entered days", () => {
    expect(rollupDailyValues([1, 2, 3], "count")).toBe(3);
  });
});

describe("deriveTargetRule", () => {
  it("maps operators to legacy target rules", () => {
    expect(deriveTargetRule("number", ">=")).toBe("higher_is_better");
    expect(deriveTargetRule("number", "<=")).toBe("lower_is_better");
    expect(deriveTargetRule("number", "=")).toBe("exact");
    expect(deriveTargetRule("number", "between")).toBe("range");
    expect(deriveTargetRule("boolean", "=")).toBe("boolean");
  });
});

describe("formatMetricValue", () => {
  it("formats currency and percentage", () => {
    expect(formatMetricValue(1200, "currency")).toMatch(/\$1,200/);
    expect(formatMetricValue(85, "percentage")).toBe("85%");
  });

  it("formats boolean and time", () => {
    expect(formatMetricValue(1, "boolean")).toBe("Yes");
    expect(formatMetricValue(90, "time", "duration")).toBe("1:30");
    expect(formatMetricValue(840, "time", "clock")).toBe("2:00 PM");
  });
});

describe("time input helpers", () => {
  it("converts duration minutes to h:mm display", () => {
    expect(minutesToTimeInput(90)).toBe("1:30");
    expect(minutesToTimeInput(45)).toBe("45m");
    expect(minutesToTimeInput(null)).toBe("");
  });

  it("parses duration h:mm and plain minutes", () => {
    expect(parseDurationTimeInput("1:30")).toBe(90);
    expect(parseDurationTimeInput("90")).toBe(90);
    expect(parseDurationTimeInput("")).toBeNull();
    expect(Number.isNaN(parseDurationTimeInput("1:90")!)).toBe(true);
  });

  it("parses and formats clock time (ship-by 2 PM)", () => {
    expect(parseClockTimeInput("2")).toBe(840);
    expect(parseClockTimeInput("2:00 PM")).toBe(840);
    expect(parseClockTimeInput("1:45 PM")).toBe(825);
    expect(formatClockTime(840)).toBe("2:00 PM");
    expect(clockTimeToInput(840)).toBe("2:00 PM");
  });

  it("round-trips through metric input helpers", () => {
    expect(metricValueToInput(840, "time", "clock")).toBe("2:00 PM");
    expect(parseMetricInputValue("2", "time", "clock")).toBe(840);
    expect(metricValueToInput(90, "time", "duration")).toBe("1:30");
  });
});

describe("evaluateMetricStatusByOperator", () => {
  it("uses strict greater-than comparison", () => {
    expect(evaluateMetricStatusByOperator(">", 10, 10, 10)).toBe("red");
    expect(evaluateMetricStatusByOperator(">", 11, 10, 10)).toBe("green");
  });

  it("uses strict clock-time comparison for ship-by deadlines", () => {
    const target = 840; // 2:00 PM
    const onTime = 825; // 1:45 PM
    const late = 860; // 2:20 PM

    expect(evaluateMetricStatusByOperator("<=", onTime, target, 10, undefined, true)).toBe(
      "green",
    );
    expect(evaluateMetricStatusByOperator("<=", target, target, 10, undefined, true)).toBe(
      "green",
    );
    expect(evaluateMetricStatusByOperator("<=", late, target, 10, undefined, true)).toBe("red");
    expect(evaluateMetricStatusByOperator("<", late, target, 10, undefined, true)).toBe("red");
  });
});

describe("evaluateMetricForRow", () => {
  it("applies strict clock-time rules for time-of-day metrics", () => {
    const metric = {
      target_rule: "lower_is_better" as const,
      target_operator: "<=" as const,
      target_value: 840,
      value_type: "time",
      time_kind: "clock",
      tolerance_percent: 10,
    };

    expect(evaluateMetricForRow(metric, 825, 840)).toBe("green");
    expect(evaluateMetricForRow(metric, 860, 840)).toBe("red");
  });
});

describe("getDatesInWeek", () => {
  it("returns seven dates starting on week start", () => {
    const dates = getDatesInWeek("2026-06-22");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-06-22");
    expect(dates[6]).toBe("2026-06-28");
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
      valueType: "number",
      targetOperator: ">=",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid between metrics", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Utilization",
      valueType: "number",
      targetOperator: "between",
      targetMin: 40,
      targetMax: 60,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(true);
  });

  it("requires rollup method for daily cadence", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Tickets",
      valueType: "number",
      targetOperator: ">=",
      targetValue: 0,
      entryCadence: "daily",
    });

    expect(result.success).toBe(false);
  });

  it("accepts daily cadence with rollup", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Tickets",
      valueType: "number",
      targetOperator: ">=",
      targetValue: 0,
      entryCadence: "daily",
      weeklyRollupMethod: "average",
    });

    expect(result.success).toBe(true);
  });

  it("coerces string target values from number inputs", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Orders",
      valueType: "number",
      targetOperator: "<=",
      targetValue: "99",
      entryCadence: "daily",
      weeklyRollupMethod: "sum",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetValue).toBe(99);
    }
  });
});

describe("updateMetricSchema", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440001";
  const metricId = "550e8400-e29b-41d4-a716-446655440003";
  const ownerId = "550e8400-e29b-41d4-a716-446655440002";

  it("allows settings-only updates without a target value", () => {
    const result = updateMetricSchema.safeParse({
      organizationId: orgId,
      metricId,
      ownerId,
      categoryId: null,
      entryCadence: "daily",
      weeklyRollupMethod: "sum",
    });

    expect(result.success).toBe(true);
  });

  it("still requires a target when target fields are updated", () => {
    const result = updateMetricSchema.safeParse({
      organizationId: orgId,
      metricId,
      targetOperator: "<=",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("targetValue"))).toBe(
        true,
      );
    }
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

describe("formatDisplayTarget", () => {
  it("formats higher_is_better as >= target", () => {
    expect(formatDisplayTarget("higher_is_better", 0)).toBe(">= 0");
  });

  it("uses display_target override when set", () => {
    expect(formatDisplayTarget("exact", 5, null, null, ">= 0")).toBe(">= 0");
  });
});

describe("formatDisplayTargetFromOperator", () => {
  it("formats operator labels with value types", () => {
    expect(formatDisplayTargetFromOperator(">=", 0, null, null, "number")).toBe(">= 0");
    expect(formatDisplayTargetFromOperator(">=", 1000, null, null, "currency")).toMatch(
      /\$1,000/,
    );
  });
});

describe("getPeriodColumns", () => {
  it("returns monthly columns", () => {
    const cols = getPeriodColumns("monthly", 3, new Date(2026, 5, 15));
    expect(cols).toHaveLength(3);
    expect(cols[2]).toMatch(/2026-/);
  });
});

describe("createMetricSchema formula datasource", () => {
  const orgId = "550e8400-e29b-41d4-a716-446655440001";
  const ownerId = "550e8400-e29b-41d4-a716-446655440002";
  const metricId = "550e8400-e29b-41d4-a716-446655440003";

  it("requires formula when datasource is formula", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Manager total",
      targetValue: 100,
      datasource: "formula",
    });
    expect(result.success).toBe(false);
  });

  it("accepts formula datasource with metric token", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Manager total",
      targetValue: 100,
      datasource: "formula",
      formula: `{{metric:${orgId}:${metricId}}} + 1`,
    });
    expect(result.success).toBe(true);
  });

  it("accepts daily cadence formula with weekly rollup", () => {
    const result = createMetricSchema.safeParse({
      organizationId: orgId,
      ownerId,
      name: "Daily total",
      targetValue: 100,
      entryCadence: "daily",
      weeklyRollupMethod: "sum",
      datasource: "formula",
      formula: `{{metric:${orgId}:${metricId}}} + 1`,
    });
    expect(result.success).toBe(true);
  });
});
