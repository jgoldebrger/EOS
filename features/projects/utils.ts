import type { ProjectWorkItemStateDb } from "@/types/database";

export const WORK_ITEM_STATE_ORDER: ProjectWorkItemStateDb[] = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "cancelled",
];

export const KANBAN_COLUMNS: ProjectWorkItemStateDb[] = [
  "backlog",
  "unstarted",
  "started",
  "completed",
];

export function formatWorkItemIdentifier(
  prefix: string,
  sequenceNumber: number,
): string {
  return `${prefix}-${sequenceNumber}`;
}

export function formatProjectStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export function formatWorkItemState(state: string): string {
  return state.replace(/_/g, " ");
}

export function isOpenWorkItemState(state: string): boolean {
  return state !== "completed" && state !== "cancelled";
}

export function filterWorkItems<T extends { title: string; state: string; priority: string; assignee_id: string | null; module_id: string | null; cycle_id: string | null }>(
  items: T[],
  filters: {
    state?: string;
    priority?: string;
    assigneeId?: string;
    moduleId?: string;
    cycleId?: string;
    search?: string;
  },
): T[] {
  return items.filter((item) => {
    if (filters.state && item.state !== filters.state) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.assigneeId && item.assignee_id !== filters.assigneeId) return false;
    if (filters.moduleId && item.module_id !== filters.moduleId) return false;
    if (filters.cycleId && item.cycle_id !== filters.cycleId) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!item.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
