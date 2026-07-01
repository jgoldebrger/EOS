"use client";

import type {
  ProjectCycle,
  ProjectMemberOption,
  ProjectModule,
  SavedViewFilters,
  WorkItemFilters,
} from "@/features/projects/types";
import {
  WORK_ITEM_PRIORITIES,
  WORK_ITEM_STATES,
} from "@/features/projects/schema";
import { formatWorkItemState } from "@/features/projects/utils";
import { Input } from "@/components/ui/input";

export const EMPTY_WORK_ITEM_FILTERS: WorkItemFilters = {};

const selectClassName =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm";

export function savedViewToFilters(raw: SavedViewFilters): WorkItemFilters {
  return {
    search: raw.search,
    state: raw.state as WorkItemFilters["state"],
    priority: raw.priority as WorkItemFilters["priority"],
    assigneeId: raw.assigneeId,
    moduleId: raw.moduleId,
    cycleId: raw.cycleId,
  };
}

export function filtersToSavedView(filters: WorkItemFilters): SavedViewFilters {
  return {
    search: filters.search,
    state: filters.state,
    priority: filters.priority,
    assigneeId: filters.assigneeId,
    moduleId: filters.moduleId,
    cycleId: filters.cycleId,
  };
}

interface ProjectFiltersToolbarProps {
  filters: WorkItemFilters;
  onChange: (filters: WorkItemFilters) => void;
  members: ProjectMemberOption[];
  modules: ProjectModule[];
  cycles: ProjectCycle[];
  children?: React.ReactNode;
}

export function ProjectFiltersToolbar({
  filters,
  onChange,
  members,
  modules,
  cycles,
  children,
}: ProjectFiltersToolbarProps) {
  function update<K extends keyof WorkItemFilters>(key: K, value: WorkItemFilters[K]) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search work items…"
        className="max-w-xs"
        value={filters.search ?? ""}
        onChange={(e) => update("search", e.target.value)}
      />
      <select
        className={selectClassName}
        value={filters.state ?? ""}
        onChange={(e) =>
          update("state", e.target.value as WorkItemFilters["state"])
        }
        aria-label="Filter by state"
      >
        <option value="">All states</option>
        {WORK_ITEM_STATES.map((state) => (
          <option key={state} value={state}>
            {formatWorkItemState(state)}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        value={filters.priority ?? ""}
        onChange={(e) =>
          update("priority", e.target.value as WorkItemFilters["priority"])
        }
        aria-label="Filter by priority"
      >
        <option value="">All priorities</option>
        {WORK_ITEM_PRIORITIES.map((priority) => (
          <option key={priority} value={priority} className="capitalize">
            {priority}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        value={filters.assigneeId ?? ""}
        onChange={(e) => update("assigneeId", e.target.value)}
        aria-label="Filter by assignee"
      >
        <option value="">All assignees</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.label}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        value={filters.moduleId ?? ""}
        onChange={(e) => update("moduleId", e.target.value)}
        aria-label="Filter by module"
      >
        <option value="">All modules</option>
        {modules.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <select
        className={selectClassName}
        value={filters.cycleId ?? ""}
        onChange={(e) => update("cycleId", e.target.value)}
        aria-label="Filter by cycle"
      >
        <option value="">All cycles</option>
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}
