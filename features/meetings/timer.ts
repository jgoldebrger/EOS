export interface MeetingSectionTimer {
  sectionKey: string;
  startedAt: string;
  extensions: Record<string, number>;
}

export interface ParsedMeetingTimer {
  sectionKey: string | null;
  startedAt: Date | null;
  extensions: Record<string, number>;
}

export function parseMeetingTimer(metadata: unknown): ParsedMeetingTimer {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return { sectionKey: null, startedAt: null, extensions: {} };
  }

  const timer = (metadata as Record<string, unknown>).timer;
  if (typeof timer !== "object" || timer === null || Array.isArray(timer)) {
    return { sectionKey: null, startedAt: null, extensions: {} };
  }

  const record = timer as Record<string, unknown>;
  const extensions: Record<string, number> = {};

  if (
    typeof record.extensions === "object" &&
    record.extensions !== null &&
    !Array.isArray(record.extensions)
  ) {
    for (const [key, value] of Object.entries(record.extensions)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        extensions[key] = value;
      }
    }
  }

  return {
    sectionKey: typeof record.sectionKey === "string" ? record.sectionKey : null,
    startedAt:
      typeof record.startedAt === "string" ? new Date(record.startedAt) : null,
    extensions,
  };
}

export function buildMeetingTimer(
  sectionKey: string,
  startedAt: string = new Date().toISOString(),
  extensions: Record<string, number> = {},
): MeetingSectionTimer {
  return { sectionKey, startedAt, extensions };
}

export function mergeTimerIntoMetadata(
  metadata: Record<string, unknown>,
  timer: MeetingSectionTimer,
): Record<string, unknown> {
  return {
    ...metadata,
    timer,
  };
}
