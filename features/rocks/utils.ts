import type { RockWithOwner } from "@/features/rocks/types";

const QUARTER_PATTERN = /^\d{4}-Q[1-4]$/;
const LOW_CONFIDENCE_THRESHOLD = 4;
const DUE_SOON_DAYS = 14;

export function getCurrentQuarter(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

export function isValidQuarter(value: string): boolean {
  return QUARTER_PATTERN.test(value);
}

export function formatQuarterLabel(quarter: string): string {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return quarter;
  return `Q${match[2]} ${match[1]}`;
}

export function isRockAtRisk(rock: Pick<RockWithOwner, "status" | "confidence" | "due_date">): boolean {
  if (rock.status === "off_track") {
    return true;
  }

  if (
    rock.confidence !== null &&
    rock.confidence !== undefined &&
    rock.confidence <= LOW_CONFIDENCE_THRESHOLD
  ) {
    return true;
  }

  if (rock.due_date) {
    const due = new Date(`${rock.due_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= DUE_SOON_DAYS && rock.status !== "done") {
      return true;
    }
  }

  return false;
}

export function getAtRiskReason(
  rock: Pick<RockWithOwner, "status" | "confidence" | "due_date">,
): string | null {
  if (rock.status === "off_track") {
    return "Off track";
  }

  if (
    rock.confidence !== null &&
    rock.confidence !== undefined &&
    rock.confidence <= LOW_CONFIDENCE_THRESHOLD
  ) {
    return `Low confidence (${rock.confidence}/10)`;
  }

  if (rock.due_date && rock.status !== "done") {
    const due = new Date(`${rock.due_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= DUE_SOON_DAYS) {
      return diffDays === 0 ? "Due today" : `Due in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
    }
  }

  return null;
}
