import { describe, expect, it } from "vitest";
import {
  DAY_OF_WEEK_LABELS,
  formatScheduleSummary,
  getNextOccurrenceUtc,
  shouldSendReminder,
  type MeetingSchedule,
} from "@/features/meetings/schedule-utils";

function baseSchedule(overrides: Partial<MeetingSchedule> = {}): MeetingSchedule {
  return {
    id: "schedule-1",
    organization_id: "org-1",
    team_id: "team-1",
    day_of_week: 1,
    time_local: "09:00:00",
    timezone: "UTC",
    reminder_hours_before: 24,
    enabled: true,
    last_reminder_at: null,
    ...overrides,
  };
}

describe("formatScheduleSummary", () => {
  it("formats day, time, and timezone", () => {
    expect(formatScheduleSummary(baseSchedule())).toBe("Mondays at 09:00 (UTC)");
    expect(DAY_OF_WEEK_LABELS[1]).toBe("Monday");
  });
});

describe("getNextOccurrenceUtc", () => {
  it("returns a future date", () => {
    const from = new Date("2026-07-06T12:00:00.000Z");
    const next = getNextOccurrenceUtc(baseSchedule({ day_of_week: 1, time_local: "09:00:00" }), from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
  });
});

describe("shouldSendReminder", () => {
  it("is not due before reminder window", () => {
    const schedule = baseSchedule({ reminder_hours_before: 48 });
    const now = new Date("2026-07-06T12:00:00.000Z");
    expect(shouldSendReminder(schedule, now).due).toBe(false);
  });

  it("is due inside reminder window when never reminded", () => {
    const schedule = baseSchedule({
      day_of_week: 1,
      time_local: "09:00:00",
      timezone: "UTC",
      reminder_hours_before: 1,
    });
    const now = new Date("2026-07-06T08:30:00.000Z");
    expect(shouldSendReminder(schedule, now).due).toBe(true);
  });

  it("skips when already reminded for this occurrence", () => {
    const schedule = baseSchedule({
      day_of_week: 1,
      time_local: "09:00:00",
      timezone: "UTC",
      reminder_hours_before: 1,
      last_reminder_at: "2026-07-07T08:00:00.000Z",
    });
    const now = new Date("2026-07-07T08:30:00.000Z");
    expect(shouldSendReminder(schedule, now).due).toBe(false);
  });
});
