import { describe, expect, it } from "vitest";
import {
  buildMeetingTimer,
  mergeTimerIntoMetadata,
  parseMeetingTimer,
} from "@/features/meetings/timer";

describe("meeting timer metadata", () => {
  it("parses timer from meeting metadata", () => {
    const parsed = parseMeetingTimer({
      timer: {
        sectionKey: "issues",
        startedAt: "2026-06-01T12:00:00.000Z",
        extensions: { issues: 5 },
      },
    });

    expect(parsed.sectionKey).toBe("issues");
    expect(parsed.startedAt?.toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(parsed.extensions).toEqual({ issues: 5 });
  });

  it("merges timer without dropping other metadata keys", () => {
    const merged = mergeTimerIntoMetadata(
      { cascadingMessages: [{ label: "Win", completed: false }] },
      buildMeetingTimer("rocks", "2026-06-01T12:05:00.000Z"),
    );

    expect(merged.cascadingMessages).toEqual([{ label: "Win", completed: false }]);
    expect(merged.timer).toEqual({
      sectionKey: "rocks",
      startedAt: "2026-06-01T12:05:00.000Z",
      extensions: {},
    });
  });
});
