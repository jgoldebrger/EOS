import { describe, expect, it } from "vitest";
import {
  aggregateMilestoneHealth,
  getMilestoneHealthStatus,
} from "@/features/rocks/milestone-health";
import {
  buildIdsRecapSummary,
  ensureIdsFocusStarted,
  getIdsFocusRemainingSeconds,
  parseIdsSession,
} from "@/features/meetings/ids-session";
import {
  findOffTrackMetrics,
  getIsoWeekKey,
  getWeekStartIso,
  groupOffTrackByOwner,
} from "@/lib/scorecard/off-track-metrics";

describe("milestone health", () => {
  const today = new Date("2026-07-07T12:00:00");

  it("marks overdue milestones", () => {
    expect(
      getMilestoneHealthStatus(
        { completed_at: null, due_date: "2026-07-01" },
        today,
      ),
    ).toBe("overdue");
  });

  it("marks at-risk milestones within 7 days", () => {
    expect(
      getMilestoneHealthStatus(
        { completed_at: null, due_date: "2026-07-10" },
        today,
      ),
    ).toBe("at_risk");
  });

  it("aggregates milestone health counts", () => {
    const counts = aggregateMilestoneHealth(
      [
        { completed_at: "2026-07-01T00:00:00Z", due_date: "2026-07-01" },
        { completed_at: null, due_date: "2026-07-01" },
        { completed_at: null, due_date: "2026-08-01" },
      ],
      today,
    );

    expect(counts.completed).toBe(1);
    expect(counts.overdue).toBe(1);
    expect(counts.onTrack).toBe(1);
    expect(counts.healthPct).toBe(67);
  });
});

describe("IDS session", () => {
  it("parses ids session from meeting metadata", () => {
    const session = parseIdsSession({
      idsSession: {
        pinnedIssueIds: ["550e8400-e29b-41d4-a716-446655440001"],
        focusIndex: 0,
        focusStartedAt: "2026-07-07T12:00:00.000Z",
        focusMinutesPerIssue: 5,
        focusExtraSeconds: 30,
        focusLog: [],
      },
    });

    expect(session.pinnedIssueIds).toHaveLength(1);
    expect(session.focusMinutesPerIssue).toBe(5);
    expect(session.focusExtraSeconds).toBe(30);
  });

  it("auto-starts focus timer when pins exist", () => {
    const next = ensureIdsFocusStarted(
      {
        pinnedIssueIds: ["550e8400-e29b-41d4-a716-446655440001"],
        focusIndex: 0,
        focusStartedAt: null,
        focusMinutesPerIssue: 5,
        focusExtraSeconds: 0,
        focusLog: [],
      },
      new Date("2026-07-07T12:00:00Z"),
    );

    expect(next.focusStartedAt).toBe("2026-07-07T12:00:00.000Z");
  });

  it("counts down focus time with extensions", () => {
    const remaining = getIdsFocusRemainingSeconds(
      {
        pinnedIssueIds: ["550e8400-e29b-41d4-a716-446655440001"],
        focusIndex: 0,
        focusStartedAt: "2026-07-07T12:00:00.000Z",
        focusMinutesPerIssue: 5,
        focusExtraSeconds: 60,
        focusLog: [],
      },
      new Date("2026-07-07T12:03:00.000Z"),
    );

    expect(remaining).toBe(180);
  });

  it("builds IDS recap summary", () => {
    const recap = buildIdsRecapSummary(
      {
        pinnedIssueIds: ["a", "b"],
        focusIndex: 1,
        focusStartedAt: null,
        focusMinutesPerIssue: 5,
        focusExtraSeconds: 0,
        focusLog: [{ issueId: "a", title: "Hiring", secondsSpent: 300 }],
      },
      [
        { id: "a", status: "solved", is_parking_lot: false },
        { id: "b", status: "open", is_parking_lot: true },
      ],
    );

    expect(recap.solvedCount).toBe(1);
    expect(recap.parkingLotCount).toBe(1);
    expect(recap.focusLog).toHaveLength(1);
  });
});

describe("off-track metrics", () => {
  it("finds red and yellow metrics for owners", () => {
    const offTrack = findOffTrackMetrics(
      [
        {
          id: "metric-1",
          name: "Revenue",
          team_id: "team-1",
          owner_id: "owner-1",
          target_rule: "exact",
          target_operator: ">=",
          target_value: 100,
          tolerance_percent: 10,
        },
      ],
      [
        {
          metric_id: "metric-1",
          actual: 80,
          status_override: null,
          target_snapshot: 100,
          period_start: "2026-07-01",
        },
      ],
    );

    expect(offTrack).toHaveLength(1);
    expect(offTrack[0]?.status).toBe("red");

    const grouped = groupOffTrackByOwner(offTrack);
    expect(grouped.get("owner-1")).toHaveLength(1);
  });

  it("builds ISO week keys", () => {
    expect(getIsoWeekKey(new Date("2026-07-07T12:00:00Z"))).toMatch(/^\d{4}-W\d{2}$/);
    expect(getWeekStartIso(new Date("2026-07-07T12:00:00"))).toContain("2026-07-06");
  });
});
