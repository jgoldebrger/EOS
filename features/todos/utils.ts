import type { TodoStatusDb } from "@/types/database";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getSevenDayEndDate(referenceDate: Date = new Date()): string {
  const end = new Date(referenceDate);
  end.setDate(end.getDate() + 7);
  return toDateString(end);
}

export function isTodoOverdue(
  dueDate: string | null,
  status: TodoStatusDb,
  referenceDate: Date = new Date(),
): boolean {
  if (!dueDate || status !== "open") {
    return false;
  }

  return dueDate < toDateString(referenceDate);
}

export function isInSevenDayWindow(
  dueDate: string | null,
  status: TodoStatusDb,
  referenceDate: Date = new Date(),
): boolean {
  if (!dueDate || status !== "open") {
    return false;
  }

  return dueDate <= getSevenDayEndDate(referenceDate);
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "No due date";
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
