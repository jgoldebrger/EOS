import type { AgendaStep, L10AgendaTemplate } from "@/features/meetings/types";

/** Default EOS L10 agenda with standard time boxes (minutes). */
export const DEFAULT_L10_AGENDA: L10AgendaTemplate = [
  { key: "segue", label: "Segue", durationMinutes: 5, required: false },
  { key: "scorecard", label: "Scorecard", durationMinutes: 5, required: true },
  { key: "rocks", label: "Rocks", durationMinutes: 5, required: true },
  { key: "headlines", label: "Headlines", durationMinutes: 5, required: false },
  { key: "todos", label: "To-Dos", durationMinutes: 5, required: true },
  { key: "issues", label: "Issues (IDS)", durationMinutes: 60, required: true },
  { key: "conclude", label: "Conclude", durationMinutes: 5, required: true },
];

export function getDefaultL10Agenda(): L10AgendaTemplate {
  return DEFAULT_L10_AGENDA.map((step) => ({ ...step }));
}

export function parseAgendaTemplate(raw: unknown): L10AgendaTemplate {
  if (!Array.isArray(raw)) {
    return getDefaultL10Agenda();
  }

  const parsed = raw.filter(
    (item): item is AgendaStep =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as AgendaStep).key === "string" &&
      typeof (item as AgendaStep).label === "string" &&
      typeof (item as AgendaStep).durationMinutes === "number" &&
      typeof (item as AgendaStep).required === "boolean",
  );

  return parsed.length > 0 ? parsed : getDefaultL10Agenda();
}

export function getFirstSectionKey(agenda: L10AgendaTemplate): string {
  return agenda[0]?.key ?? "segue";
}

export function getSectionByKey(
  agenda: L10AgendaTemplate,
  sectionKey: string,
): AgendaStep | undefined {
  return agenda.find((step) => step.key === sectionKey);
}

export function formatSectionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function getTotalAgendaMinutes(agenda: L10AgendaTemplate): number {
  return agenda.reduce((sum, step) => sum + step.durationMinutes, 0);
}

/** Elapsed seconds since section start; falls back to 0 when no start time. */
export function getSectionElapsedSeconds(
  sectionStartedAt: Date | null,
  now: Date = new Date(),
): number {
  if (!sectionStartedAt) {
    return 0;
  }
  return Math.max(0, Math.floor((now.getTime() - sectionStartedAt.getTime()) / 1000));
}

/** Remaining seconds for a section timer; negative when over time. */
export function getSectionRemainingSeconds(
  durationMinutes: number,
  sectionStartedAt: Date | null,
  now: Date = new Date(),
): number {
  const budgetSeconds = durationMinutes * 60;
  return budgetSeconds - getSectionElapsedSeconds(sectionStartedAt, now);
}

export function isSectionOvertime(
  durationMinutes: number,
  sectionStartedAt: Date | null,
  now: Date = new Date(),
): boolean {
  return getSectionRemainingSeconds(durationMinutes, sectionStartedAt, now) < 0;
}

export function formatTimerDisplay(totalSeconds: number): string {
  const absSeconds = Math.abs(totalSeconds);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return totalSeconds < 0 ? `-${formatted}` : formatted;
}

export function meetingStatusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function isUpcomingMeeting(status: string): boolean {
  return status === "scheduled" || status === "in_progress";
}
