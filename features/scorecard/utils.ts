import { resolveDisplayName } from "@/lib/users/display-name";

export type MetricStatus = "green" | "yellow" | "red" | "na";

export type TargetRule =
  | "higher_is_better"
  | "lower_is_better"
  | "range"
  | "exact"
  | "boolean";

export type ValueType = "number" | "currency" | "percentage" | "boolean" | "time";

export type TimeKind = "duration" | "clock";

export type TargetOperator = ">=" | "<=" | "=" | ">" | "<" | "between";

export type EntryCadence = "daily" | "weekly";

export type RollupMethod = "sum" | "average" | "last" | "min" | "max" | "count";

export interface RangeBounds {
  min: number | null;
  max: number | null;
}

export function deriveTargetRule(
  valueType: ValueType,
  targetOperator: TargetOperator,
): TargetRule {
  if (valueType === "boolean") {
    return "boolean";
  }
  switch (targetOperator) {
    case ">=":
    case ">":
      return "higher_is_better";
    case "<=":
    case "<":
      return "lower_is_better";
    case "=":
      return "exact";
    case "between":
      return "range";
    default:
      return "exact";
  }
}

export function rollupDailyValues(
  values: number[],
  method: RollupMethod,
): number | null {
  if (values.length === 0) {
    return null;
  }

  switch (method) {
    case "sum":
      return values.reduce((sum, value) => sum + value, 0);
    case "average":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "last":
      return values[values.length - 1] ?? null;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "count":
      return values.length;
    default:
      return null;
  }
}

export function getDatesInWeek(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${weekStart}T00:00:00`);

  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDateOnly(d));
  }

  return dates;
}

export function getWeekStartForDate(dateStr: string): string {
  return getWeekStart(new Date(`${dateStr}T00:00:00`));
}

export function getTimeKind(metric: {
  value_type?: string | null;
  time_kind?: string | null;
}): TimeKind {
  if (metric.value_type !== "time") {
    return "duration";
  }
  return metric.time_kind === "clock" ? "clock" : "duration";
}

export function formatMetricValue(
  value: number | null | undefined,
  valueType: ValueType = "number",
  timeKind: TimeKind = "duration",
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  switch (valueType) {
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);
    case "percentage":
      return `${value}%`;
    case "boolean":
      return value ? "Yes" : "No";
    case "time":
      if (timeKind === "clock") {
        return formatClockTime(value);
      }
      return formatDurationTime(value);
    default:
      return String(value);
  }
}

function formatDurationTime(value: number): string {
  const totalMinutes = Math.round(value);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }
  return `${minutes}m`;
}

/** Minutes since midnight → e.g. "2:00 PM" */
export function formatClockTime(minutesSinceMidnight: number): string {
  const normalized = ((Math.round(minutesSinceMidnight) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const displayHour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

/** Duration minutes → `h:mm` for duration time inputs. */
export function minutesToTimeInput(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined) {
    return "";
  }
  return formatDurationTime(totalMinutes);
}

/** Clock minutes since midnight → input display e.g. "2:00 PM" */
export function clockTimeToInput(minutesSinceMidnight: number | null | undefined): string {
  if (minutesSinceMidnight === null || minutesSinceMidnight === undefined) {
    return "";
  }
  return formatClockTime(minutesSinceMidnight);
}

/**
 * Parse duration entry to total minutes (e.g. 1:30 → 90).
 */
export function parseDurationTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    const seconds = colonMatch[3] ? Number(colonMatch[3]) : 0;

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      minutes >= 60 ||
      seconds >= 60
    ) {
      return Number.NaN;
    }

    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? Number.NaN : Math.round(parsed);
  }

  return Number.NaN;
}

/**
 * Parse clock time to minutes since midnight.
 * Accepts "2", "2 PM", "2:30 PM", "14:00", "230", "1430".
 * Bare 1–12 defaults to PM (e.g. 2 → 2:00 PM). Compact 3-digit HMM uses PM default (230 → 2:30 PM).
 */
export function parseClockTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const upper = trimmed.toUpperCase();

  const ampmMatch = upper.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] ?? 0);
    const meridiem = ampmMatch[3];

    if (hours < 1 || hours > 12 || minutes >= 60) {
      return Number.NaN;
    }

    if (meridiem === "PM" && hours !== 12) {
      hours += 12;
    }
    if (meridiem === "AM" && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  const colonMatch = upper.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (colonMatch) {
    const hours = Number(colonMatch[1]);
    const minutes = Number(colonMatch[2]);
    const seconds = colonMatch[3] ? Number(colonMatch[3]) : 0;

    if (hours > 23 || minutes >= 60 || seconds >= 60) {
      return Number.NaN;
    }

    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  const compactMatch = upper.match(/^(\d{3,4})$/);
  if (compactMatch) {
    const digits = compactMatch[1];
    if (digits.length === 3) {
      const hour = Number(digits[0]);
      const minutes = Number(digits.slice(1));
      if (hour >= 1 && hour <= 9 && minutes < 60) {
        const hours24 = hour === 12 ? 12 : hour + 12;
        return hours24 * 60 + minutes;
      }
    } else {
      const hours = Number(digits.slice(0, 2));
      const minutes = Number(digits.slice(2));
      if (hours <= 23 && minutes < 60) {
        return hours * 60 + minutes;
      }
    }
    return Number.NaN;
  }

  if (/^\d{1,2}$/.test(upper)) {
    const hour = Number(upper);
    if (hour < 1 || hour > 12) {
      return Number.NaN;
    }
    const hours24 = hour === 12 ? 12 : hour + 12;
    return hours24 * 60;
  }

  return Number.NaN;
}

/** @deprecated Use parseDurationTimeInput or parseClockTimeInput */
export function parseTimeInput(input: string): number | null {
  return parseDurationTimeInput(input);
}

export function parseMetricInputValue(
  input: string,
  valueType: ValueType = "number",
  timeKind: TimeKind = "duration",
): number | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  if (valueType === "time") {
    const parsed =
      timeKind === "clock"
        ? parseClockTimeInput(trimmed)
        : parseDurationTimeInput(trimmed);
    if (parsed === null || Number.isNaN(parsed)) {
      return Number.NaN;
    }
    return parsed;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

export function metricValueToInput(
  value: number | null | undefined,
  valueType: ValueType = "number",
  timeKind: TimeKind = "duration",
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (valueType === "time") {
    return timeKind === "clock"
      ? clockTimeToInput(value)
      : minutesToTimeInput(value);
  }

  return String(value);
}

export function formatDisplayTargetFromOperator(
  targetOperator: TargetOperator,
  targetValue: number | null | undefined,
  targetMin?: number | null,
  targetMax?: number | null,
  valueType: ValueType = "number",
  timeKind: TimeKind = "duration",
): string {
  if (targetOperator === "between") {
    if (targetMin != null && targetMax != null) {
      return `${formatMetricValue(targetMin, valueType, timeKind)} – ${formatMetricValue(targetMax, valueType, timeKind)}`;
    }
    return "—";
  }

  if (valueType === "boolean") {
    return targetValue ? "Yes" : "No";
  }

  if (targetValue === null || targetValue === undefined) {
    return "—";
  }

  return `${targetOperator} ${formatMetricValue(targetValue, valueType, timeKind)}`;
}

export function evaluateMetricStatusByOperator(
  targetOperator: TargetOperator,
  actual: number | null | undefined,
  target: number | null | undefined,
  tolerancePercent = 10,
  range?: RangeBounds,
  clockTime = false,
): MetricStatus {
  if (actual === null || actual === undefined) {
    return "na";
  }

  const tolerance = tolerancePercent / 100;

  switch (targetOperator) {
    case "=": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual === target ? "green" : "red";
      }
      const margin = Math.abs(target) * tolerance || tolerance;
      return Math.abs(actual - target) <= margin ? "green" : "red";
    }
    case ">=": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual >= target ? "green" : "red";
      }
      if (actual >= target) {
        return "green";
      }
      const yellowFloor = target * (1 - tolerance);
      return actual >= yellowFloor ? "yellow" : "red";
    }
    case ">": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual > target ? "green" : "red";
      }
      if (actual > target) {
        return "green";
      }
      if (actual === target) {
        return "red";
      }
      const yellowFloor = target * (1 - tolerance);
      return actual > yellowFloor ? "yellow" : "red";
    }
    case "<=": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual <= target ? "green" : "red";
      }
      if (actual <= target) {
        return "green";
      }
      const yellowCeiling = target * (1 + tolerance);
      return actual <= yellowCeiling ? "yellow" : "red";
    }
    case "<": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual < target ? "green" : "red";
      }
      if (actual < target) {
        return "green";
      }
      if (actual === target) {
        return "red";
      }
      const yellowCeiling = target * (1 + tolerance);
      return actual < yellowCeiling ? "yellow" : "red";
    }
    case "between": {
      const min = range?.min;
      const max = range?.max;
      if (min === null || min === undefined || max === null || max === undefined) {
        return "na";
      }
      if (actual >= min && actual <= max) {
        return "green";
      }
      if (clockTime) {
        return "red";
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

export function evaluateMetricForRow(
  metric: {
    target_rule: TargetRule;
    target_operator?: TargetOperator | string | null;
    target_value?: number | null;
    target_min?: number | null;
    target_max?: number | null;
    tolerance_percent?: number | null;
    value_type?: ValueType | string | null;
    time_kind?: TimeKind | string | null;
  },
  actual: number | null | undefined,
  targetSnapshot?: number | null,
): MetricStatus {
  const clockTime =
    (metric.value_type ?? "number") === "time" && getTimeKind(metric) === "clock";
  const target =
    targetSnapshot ??
    (metric.target_value === null || metric.target_value === undefined
      ? null
      : Number(metric.target_value));
  const tolerance = Number(metric.tolerance_percent ?? 10);
  const range = {
    min:
      metric.target_min === null || metric.target_min === undefined
        ? null
        : Number(metric.target_min),
    max:
      metric.target_max === null || metric.target_max === undefined
        ? null
        : Number(metric.target_max),
  };

  const operator = metric.target_operator as TargetOperator | null | undefined;
  if (operator) {
    return evaluateMetricStatusByOperator(
      operator,
      actual,
      target,
      tolerance,
      range,
      clockTime,
    );
  }

  return evaluateMetricStatus(
    metric.target_rule as TargetRule,
    actual,
    target,
    tolerance,
    range,
    clockTime,
  );
}

export function formatMetricDisplayTarget(
  metric: {
    target_rule: TargetRule;
    target_operator?: TargetOperator | string | null;
    target_value?: number | null;
    target_min?: number | null;
    target_max?: number | null;
    value_type?: ValueType | string | null;
    time_kind?: TimeKind | string | null;
    display_target?: string | null;
  },
): string {
  const valueType = (metric.value_type ?? "number") as ValueType;
  const timeKind = getTimeKind(metric);
  const operator = (metric.target_operator ?? null) as TargetOperator | null;

  if (operator) {
    return formatDisplayTargetFromOperator(
      operator,
      metric.target_value === null || metric.target_value === undefined
        ? null
        : Number(metric.target_value),
      metric.target_min === null ? null : Number(metric.target_min),
      metric.target_max === null ? null : Number(metric.target_max),
      valueType,
      timeKind,
    );
  }

  return formatDisplayTarget(
    metric.target_rule as TargetRule,
    metric.target_value === null || metric.target_value === undefined
      ? null
      : Number(metric.target_value),
    metric.target_min === null ? null : Number(metric.target_min),
    metric.target_max === null ? null : Number(metric.target_max),
    metric.display_target,
  );
}

export const ROLLUP_METHOD_LABELS: Record<RollupMethod, string> = {
  sum: "Sum",
  average: "Average",
  last: "Last",
  min: "Min",
  max: "Max",
  count: "Count",
};

export function evaluateMetricStatus(
  targetRule: TargetRule,
  actual: number | null | undefined,
  target: number | null | undefined,
  tolerancePercent = 10,
  range?: RangeBounds,
  clockTime = false,
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
      if (clockTime) {
        return actual === target ? "green" : "red";
      }
      const margin = Math.abs(target) * tolerance || tolerance;
      return Math.abs(actual - target) <= margin ? "green" : "red";
    }
    case "higher_is_better": {
      if (target === null || target === undefined) {
        return "na";
      }
      if (clockTime) {
        return actual >= target ? "green" : "red";
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
      if (clockTime) {
        return actual <= target ? "green" : "red";
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
      if (clockTime) {
        return "red";
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

export type PeriodType = "weekly" | "monthly" | "quarterly" | "annual";

export function formatDisplayTarget(
  targetRule: TargetRule,
  targetValue: number | null | undefined,
  targetMin?: number | null,
  targetMax?: number | null,
  displayTarget?: string | null,
): string {
  if (displayTarget) {
    return displayTarget;
  }
  if (targetValue === null || targetValue === undefined) {
    if (targetRule === "range" && targetMin != null && targetMax != null) {
      return `${targetMin} – ${targetMax}`;
    }
    return "—";
  }
  switch (targetRule) {
    case "higher_is_better":
      return `>= ${targetValue}`;
    case "lower_is_better":
      return `<= ${targetValue}`;
    case "exact":
      return `= ${targetValue}`;
    case "boolean":
      return targetValue ? "Yes" : "No";
    default:
      return String(targetValue);
  }
}

export function getMonthStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return formatDateOnly(d);
}

export function getQuarterStart(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3);
  const d = new Date(date.getFullYear(), quarter * 3, 1);
  return formatDateOnly(d);
}

export function getYearStart(date: Date): string {
  return formatDateOnly(new Date(date.getFullYear(), 0, 1));
}

export function getPeriodColumns(
  periodType: PeriodType,
  count = 13,
  fromDate = new Date(),
): string[] {
  const columns: string[] = [];
  const cursor = new Date(fromDate);

  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    switch (periodType) {
      case "weekly":
        d.setDate(cursor.getDate() - i * 7);
        columns.push(getWeekStart(d));
        break;
      case "monthly":
        d.setMonth(cursor.getMonth() - i);
        columns.push(getMonthStart(d));
        break;
      case "quarterly":
        d.setMonth(cursor.getMonth() - i * 3);
        columns.push(getQuarterStart(d));
        break;
      case "annual":
        d.setFullYear(cursor.getFullYear() - i);
        columns.push(getYearStart(d));
        break;
    }
  }

  return columns;
}

export function formatPeriodLabel(periodStart: string, periodType: PeriodType): string {
  const date = new Date(`${periodStart}T00:00:00`);
  switch (periodType) {
    case "weekly":
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    case "monthly":
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    case "quarterly": {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${date.getFullYear()}`;
    }
    case "annual":
      return String(date.getFullYear());
    default:
      return periodStart;
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

export function formatOwnerLabel(
  userId: string,
  email?: string | null,
  userMetadata?: Record<string, unknown> | null,
): string {
  return resolveDisplayName({ userId, email, userMetadata });
}

export const STATUS_CELL_CLASSES: Record<MetricStatus, string> = {
  green: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  red: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
  na: "bg-muted text-muted-foreground",
};
