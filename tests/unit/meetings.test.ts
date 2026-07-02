import { describe, expect, it } from "vitest";
import {
  createDecisionSchema,
  createMeetingSchema,
  endMeetingSchema,
  saveNoteSchema,
  startMeetingSchema,
  updateActiveSectionSchema,
} from "@/features/meetings/schema";
import {
  DEFAULT_L10_AGENDA,
  formatSectionDuration,
  formatTimerDisplay,
  getDefaultL10Agenda,
  getFirstSectionKey,
  getL10HubHref,
  getL10MeetingHref,
  getMeetingHref,
  getSectionByKey,
  getSectionElapsedSeconds,
  getSectionRemainingSeconds,
  getTotalAgendaMinutes,
  isSectionOvertime,
  isUpcomingMeeting,
  meetingStatusLabel,
  parseAgendaTemplate,
} from "@/features/meetings/utils";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const meetingId = "550e8400-e29b-41d4-a716-446655440010";

describe("DEFAULT_L10_AGENDA", () => {
  it("includes all standard L10 sections", () => {
    const keys = DEFAULT_L10_AGENDA.map((step) => step.key);
    expect(keys).toEqual([
      "segue",
      "scorecard",
      "rocks",
      "headlines",
      "todos",
      "issues",
      "conclude",
    ]);
  });

  it("totals 90 minutes", () => {
    expect(getTotalAgendaMinutes(DEFAULT_L10_AGENDA)).toBe(90);
  });
});

describe("parseAgendaTemplate", () => {
  it("returns default agenda for invalid input", () => {
    expect(parseAgendaTemplate(null)).toEqual(getDefaultL10Agenda());
  });

  it("parses valid agenda arrays", () => {
    const custom = [
      { key: "custom", label: "Custom", durationMinutes: 10, required: true },
    ];
    expect(parseAgendaTemplate(custom)).toEqual(custom);
  });
});

describe("section helpers", () => {
  const agenda = getDefaultL10Agenda();

  it("gets first section key", () => {
    expect(getFirstSectionKey(agenda)).toBe("segue");
  });

  it("finds section by key", () => {
    expect(getSectionByKey(agenda, "issues")?.label).toBe("Issues (IDS)");
  });

  it("formats section duration", () => {
    expect(formatSectionDuration(60)).toBe("1h");
    expect(formatSectionDuration(65)).toBe("1h 5m");
    expect(formatSectionDuration(5)).toBe("5m");
  });
});

describe("section timers", () => {
  const startedAt = new Date(2026, 5, 15, 10, 0, 0);
  const now = new Date(2026, 5, 15, 10, 2, 30);

  it("computes elapsed seconds", () => {
    expect(getSectionElapsedSeconds(startedAt, now)).toBe(150);
  });

  it("computes remaining seconds", () => {
    expect(getSectionRemainingSeconds(5, startedAt, now)).toBe(150);
  });

  it("detects overtime", () => {
    expect(isSectionOvertime(2, startedAt, now)).toBe(true);
  });

  it("formats timer display", () => {
    expect(formatTimerDisplay(125)).toBe("2:05");
    expect(formatTimerDisplay(-30)).toBe("-0:30");
  });
});

describe("meetingStatusLabel", () => {
  it("maps known statuses", () => {
    expect(meetingStatusLabel("in_progress")).toBe("In progress");
    expect(meetingStatusLabel("scheduled")).toBe("Scheduled");
  });
});

describe("isUpcomingMeeting", () => {
  it("includes scheduled and in_progress", () => {
    expect(isUpcomingMeeting("scheduled")).toBe(true);
    expect(isUpcomingMeeting("in_progress")).toBe(true);
    expect(isUpcomingMeeting("completed")).toBe(false);
  });
});

describe("L10 route helpers", () => {
  it("builds team L10 hub and meeting hrefs", () => {
    expect(getL10HubHref("acme", "leadership")).toBe(
      "/org/acme/teams/leadership/l10",
    );
    expect(getL10MeetingHref("acme", "leadership", meetingId)).toBe(
      `/org/acme/teams/leadership/l10/${meetingId}`,
    );
  });

  it("routes team meetings to team L10 URLs", () => {
    const teams = new Map([["team-1", "leadership"]]);
    expect(
      getMeetingHref(
        "acme",
        { id: meetingId, team_id: "team-1" },
        teams,
      ),
    ).toBe(`/org/acme/teams/leadership/l10/${meetingId}`);
    expect(
      getMeetingHref("acme", { id: meetingId, team_id: null }, teams),
    ).toBe(`/org/acme/meetings/${meetingId}`);
  });
});

describe("createMeetingSchema", () => {
  it("requires organization id", () => {
    const result = createMeetingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts minimal valid input", () => {
    const result = createMeetingSchema.safeParse({ organizationId: orgId });
    expect(result.success).toBe(true);
  });
});

describe("startMeetingSchema", () => {
  it("requires meeting id", () => {
    const result = startMeetingSchema.safeParse({
      organizationId: orgId,
      meetingId,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateActiveSectionSchema", () => {
  it("requires section key", () => {
    const result = updateActiveSectionSchema.safeParse({
      organizationId: orgId,
      meetingId,
      sectionKey: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("saveNoteSchema", () => {
  it("accepts note content", () => {
    const result = saveNoteSchema.safeParse({
      organizationId: orgId,
      meetingId,
      sectionKey: "segue",
      content: "Good news from the team.",
    });
    expect(result.success).toBe(true);
  });
});

describe("createDecisionSchema", () => {
  it("requires decision title", () => {
    const result = createDecisionSchema.safeParse({
      organizationId: orgId,
      meetingId,
      title: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("endMeetingSchema", () => {
  it("accepts valid end request", () => {
    const result = endMeetingSchema.safeParse({
      organizationId: orgId,
      meetingId,
    });
    expect(result.success).toBe(true);
  });
});
