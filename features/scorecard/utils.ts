export type MetricStatus = "green" | "yellow" | "red" | "na";

export type TargetRule =
  | "higher_is_better"
  | "lower_is_better"
  | "range"
  | "exact"
  | "boolean";

export interface RangeBounds {
  min: number | null;
  max: number | null;
}

export function evaluateMetricStatus(
  targetRule: TargetRule,
  actual: number | null | undefined,
  target: number | null | undefined,
  tolerancePercent = 10,
  range?: RangeBounds,
): MetricStatus {
  if (actual === null || actual === undefined) {
    return "na";
  }

  const tolerance = tolerancePercent / 100;

  switch (targetRule) {
    case "boolean": {
      if (target === null || target === undefined) {
        return "na";
      }
      return actual === target ? "green" : "red";
    }
    case "exact": {
      if (target === null || target === undefined) {
        return "na";
      }
      const margin = Math.abs(target) * tolerance || tolerance;
      return Math.abs(actual - target) <= margin ? "green" : "red";
    }
    case "higher_is_better": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (actual >= target) {
        return "green";
      }
      const yellowFloor = target * (1 - tolerance);
      return actual >= yellowFloor ? "yellow" : "red";
    }
    case "lower_is_better": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (actual <= target) {
        return "green";
      }
      const yellowCeiling = target * (1 + tolerance);
      return actual <= yellowCeiling ? "yellow" : "red";
    }
    case "range": {
      const min = range?.min;
      const max = range?.max;
      if (min === null || min === undefined || max === null || max === undefined) {
        return "na";
      }
      if (actual >= min && actual <= max) {
        return "green";
      }
      const span = max - min || 1;
      const margin = span * tolerance;
      if (actual >= min - margin && actual <= max + margin) {
        return "yellow";
      }
      return "red";
    }
    default:
      return "na";
  }
}

/** Returns ISO date string (YYYY-MM-DD) for the Monday starting the week containing `date`. */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return formatDateOnly(d);
}

/** Returns the most recent `n` week-start dates (oldest first), including the current week. */
export function getLastNWeeks(n = 13, fromDate = new Date()): string[] {
  const weeks: string[] = [];
  const cursor = new Date(fromDate);

  for (let i = n - 1; i >= 0; i -= 1) {
    const weekDate = new Date(cursor);
    weekDate.setDate(cursor.getDate() - i * 7);
    weeks.push(getWeekStart(weekDate));
  }

  return weeks;
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatWeekLabel(periodStart: string): string {
  const date = new Date(`${periodStart}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatOwnerLabel(userId: string, email?: string | null): string {
  if (email) {
    const local = email.split("@")[0];
    if (local) {
      return local;
    }
  }
  return `User ${userId.slice(0, 8)}`;
}

export const STATUS_CELL_CLASSES: Record<MetricStatus, string> = {
  green: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  red: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  na: "bg-muted text-muted-foreground",
};
