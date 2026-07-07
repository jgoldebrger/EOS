export const DEFAULT_IDS_FOCUS_MINUTES = 5;

export interface IdsFocusLogEntry {
  issueId: string;
  title: string;
  secondsSpent: number;
}

export interface IdsSession {
  pinnedIssueIds: string[];
  focusIndex: number;
  focusStartedAt: string | null;
  focusMinutesPerIssue: number;
  focusExtraSeconds: number;
  focusLog: IdsFocusLogEntry[];
}

export interface IdsRecapSummary {
  pinnedIssueIds: string[];
  focusLog: IdsFocusLogEntry[];
  parkingLotCount: number;
  solvedCount: number;
  discussedCount: number;
}

const DEFAULT_SESSION: IdsSession = {
  pinnedIssueIds: [],
  focusIndex: 0,
  focusStartedAt: null,
  focusMinutesPerIssue: DEFAULT_IDS_FOCUS_MINUTES,
  focusExtraSeconds: 0,
  focusLog: [],
};

function parseFocusLog(value: unknown): IdsFocusLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      if (typeof row.issueId !== "string" || typeof row.title !== "string") {
        return null;
      }
      return {
        issueId: row.issueId,
        title: row.title,
        secondsSpent:
          typeof row.secondsSpent === "number" && row.secondsSpent >= 0
            ? row.secondsSpent
            : 0,
      };
    })
    .filter((entry): entry is IdsFocusLogEntry => entry !== null);
}

export function parseIdsSession(metadata: unknown): IdsSession {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return { ...DEFAULT_SESSION };
  }

  const raw = (metadata as Record<string, unknown>).idsSession;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ...DEFAULT_SESSION };
  }

  const session = raw as Record<string, unknown>;
  const pinnedIssueIds = Array.isArray(session.pinnedIssueIds)
    ? session.pinnedIssueIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    pinnedIssueIds,
    focusIndex:
      typeof session.focusIndex === "number" && session.focusIndex >= 0
        ? Math.min(session.focusIndex, Math.max(pinnedIssueIds.length - 1, 0))
        : 0,
    focusStartedAt:
      typeof session.focusStartedAt === "string" ? session.focusStartedAt : null,
    focusMinutesPerIssue:
      typeof session.focusMinutesPerIssue === "number" &&
      session.focusMinutesPerIssue >= 1
        ? session.focusMinutesPerIssue
        : DEFAULT_IDS_FOCUS_MINUTES,
    focusExtraSeconds:
      typeof session.focusExtraSeconds === "number" && session.focusExtraSeconds >= 0
        ? session.focusExtraSeconds
        : 0,
    focusLog: parseFocusLog(session.focusLog),
  };
}

export function mergeIdsSessionIntoMetadata(
  metadata: Record<string, unknown>,
  session: IdsSession,
): Record<string, unknown> {
  return {
    ...metadata,
    idsSession: session,
  };
}

export function getIdsFocusRemainingSeconds(
  session: IdsSession,
  now: Date = new Date(),
): number {
  if (!session.focusStartedAt || session.pinnedIssueIds.length === 0) {
    return session.focusMinutesPerIssue * 60 + session.focusExtraSeconds;
  }

  const startedAt = new Date(session.focusStartedAt);
  const budget =
    session.focusMinutesPerIssue * 60 + session.focusExtraSeconds;
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

  return Math.max(0, budget - elapsed);
}

export function isIdsFocusOvertime(session: IdsSession, now: Date = new Date()): boolean {
  return getIdsFocusRemainingSeconds(session, now) === 0 && session.focusStartedAt !== null;
}

export function buildIdsRecapSummary(
  session: IdsSession,
  issues: Array<{ id: string; status: string; is_parking_lot: boolean }>,
): IdsRecapSummary {
  const parkingLotCount = issues.filter((issue) => issue.is_parking_lot).length;
  const solvedCount = issues.filter((issue) => issue.status === "solved").length;

  return {
    pinnedIssueIds: session.pinnedIssueIds,
    focusLog: session.focusLog,
    parkingLotCount,
    solvedCount,
    discussedCount: issues.length,
  };
}

export function ensureIdsFocusStarted(session: IdsSession, now: Date = new Date()): IdsSession {
  if (session.pinnedIssueIds.length === 0 || session.focusStartedAt) {
    return session;
  }

  return {
    ...session,
    focusStartedAt: now.toISOString(),
  };
}
