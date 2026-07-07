import type { RockMilestone } from "@/features/rocks/types";

export type MilestoneHealthStatus =
  | "completed"
  | "overdue"
  | "at_risk"
  | "on_track"
  | "no_due_date";

export interface MilestoneHealthCounts {
  total: number;
  completed: number;
  overdue: number;
  atRisk: number;
  onTrack: number;
  noDueDate: number;
  healthPct: number;
}

export function getMilestoneHealthStatus(
  milestone: Pick<RockMilestone, "completed_at" | "due_date">,
  today: Date = new Date(),
): MilestoneHealthStatus {
  if (milestone.completed_at) {
    return "completed";
  }

  if (!milestone.due_date) {
    return "no_due_date";
  }

  const due = new Date(`${milestone.due_date}T00:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (due.getTime() < todayStart.getTime()) {
    return "overdue";
  }

  const daysUntil = Math.ceil(
    (due.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (daysUntil <= 7) {
    return "at_risk";
  }

  return "on_track";
}

export function aggregateMilestoneHealth(
  milestones: Array<Pick<RockMilestone, "completed_at" | "due_date">>,
  today: Date = new Date(),
): MilestoneHealthCounts {
  const counts: MilestoneHealthCounts = {
    total: milestones.length,
    completed: 0,
    overdue: 0,
    atRisk: 0,
    onTrack: 0,
    noDueDate: 0,
    healthPct: 0,
  };

  for (const milestone of milestones) {
    const status = getMilestoneHealthStatus(milestone, today);
    switch (status) {
      case "completed":
        counts.completed += 1;
        break;
      case "overdue":
        counts.overdue += 1;
        break;
      case "at_risk":
        counts.atRisk += 1;
        break;
      case "on_track":
        counts.onTrack += 1;
        break;
      case "no_due_date":
        counts.noDueDate += 1;
        break;
    }
  }

  const healthy = counts.completed + counts.onTrack + counts.noDueDate;
  counts.healthPct =
    counts.total > 0 ? Math.round((healthy / counts.total) * 100) : 100;

  return counts;
}
