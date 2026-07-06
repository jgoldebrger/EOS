import { describe, expect, it } from "vitest";
import { computeScorecardRollup } from "@/features/reports/scorecard-rollup";

describe("computeScorecardRollup", () => {
  const teamNameById = new Map([["team-1", "Sales"]]);

  it("counts green from computed status when override is absent", () => {
    const rollup = computeScorecardRollup(
      [
        {
          id: "metric-1",
          team_id: "team-1",
          target_rule: "exact",
          target_operator: ">=",
          target_value: 100,
          tolerance_percent: 10,
        },
      ],
      [
        {
          metric_id: "metric-1",
          actual: 110,
          status_override: null,
          target_snapshot: 100,
          period_start: "2026-06-01",
        },
      ],
      teamNameById,
    );

    expect(rollup).toHaveLength(1);
    expect(rollup[0]?.greenCount).toBe(1);
    expect(rollup[0]?.onTrackPct).toBe(100);
  });

  it("prefers status_override over computed status", () => {
    const rollup = computeScorecardRollup(
      [
        {
          id: "metric-1",
          team_id: "team-1",
          target_rule: "exact",
          target_operator: ">=",
          target_value: 100,
        },
      ],
      [
        {
          metric_id: "metric-1",
          actual: 110,
          status_override: "red",
          target_snapshot: 100,
          period_start: "2026-06-01",
        },
      ],
      teamNameById,
    );

    expect(rollup[0]?.redCount).toBe(1);
    expect(rollup[0]?.greenCount).toBe(0);
  });

  it("uses the latest period value per metric", () => {
    const rollup = computeScorecardRollup(
      [
        {
          id: "metric-1",
          team_id: "team-1",
          target_rule: "exact",
          target_operator: ">=",
          target_value: 100,
        },
      ],
      [
        {
          metric_id: "metric-1",
          actual: 50,
          status_override: null,
          target_snapshot: 100,
          period_start: "2026-05-01",
        },
        {
          metric_id: "metric-1",
          actual: 120,
          status_override: null,
          target_snapshot: 100,
          period_start: "2026-06-01",
        },
      ],
      teamNameById,
    );

    expect(rollup[0]?.greenCount).toBe(1);
  });
});
