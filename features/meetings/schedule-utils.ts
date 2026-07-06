export interface MeetingSchedule {
  id: string;
  organization_id: string;
  team_id: string;
  day_of_week: number;
  time_local: string;
  timezone: string;
  reminder_hours_before: number;
  enabled: boolean;
  last_reminder_at: string | null;
}

export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatScheduleSummary(schedule: MeetingSchedule): string {
  const day = DAY_OF_WEEK_LABELS[schedule.day_of_week] ?? "Unknown";
  const time = schedule.time_local.slice(0, 5);
  return `${day}s at ${time} (${schedule.timezone})`;
}

export function getNextOccurrenceUtc(
  schedule: Pick<MeetingSchedule, "day_of_week" | "time_local" | "timezone">,
  fromDate: Date = new Date(),
): Date {
  const [hours, minutes] = schedule.time_local.split(":").map((part) => Number.parseInt(part, 10));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  for (let offsetDays = 0; offsetDays < 14; offsetDays += 1) {
    const candidate = new Date(fromDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
    const parts = formatter.formatToParts(candidate);
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
    if (weekdayIndex !== schedule.day_of_week) {
      continue;
    }

    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const localIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    const asUtc = zonedTimeToUtc(localIso, schedule.timezone);
    if (asUtc.getTime() > fromDate.getTime()) {
      return asUtc;
    }
  }

  return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function zonedTimeToUtc(localIso: string, timeZone: string): Date {
  const probe = new Date(`${localIso}Z`);
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = offsetFormatter.formatToParts(probe);
  const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offset.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!match) {
    return probe;
  }
  const sign = match[1].startsWith("-") ? -1 : 1;
  const offsetHours = Math.abs(Number.parseInt(match[1], 10));
  const offsetMinutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const totalOffsetMinutes = sign * (offsetHours * 60 + offsetMinutes);
  return new Date(probe.getTime() - totalOffsetMinutes * 60 * 1000);
}

export function shouldSendReminder(
  schedule: MeetingSchedule,
  now: Date = new Date(),
): { due: boolean; nextOccurrence: Date } {
  const nextOccurrence = getNextOccurrenceUtc(schedule, now);
  const reminderAt = new Date(
    nextOccurrence.getTime() - schedule.reminder_hours_before * 60 * 60 * 1000,
  );

  if (now.getTime() < reminderAt.getTime()) {
    return { due: false, nextOccurrence };
  }

  if (schedule.last_reminder_at) {
    const last = new Date(schedule.last_reminder_at);
    if (last.getTime() >= reminderAt.getTime()) {
      return { due: false, nextOccurrence };
    }
  }

  return { due: true, nextOccurrence };
}
