"use client";

import { PageHeader } from "@/components/shared/page-header";
import { CreateTodoDialog } from "@/components/todos/create-todo-dialog";
import type {
  TodoFilters,
  TodoMemberOption,
  TodoTeamOption,
} from "@/features/todos/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
] as const;

interface TodosPageHeaderProps {
  organizationId: string;
  canCreate: boolean;
  teams: TodoTeamOption[];
  members: TodoMemberOption[];
  defaultOwnerId: string;
  filters: TodoFilters;
  onFiltersChange: (filters: TodoFilters) => void;
  meetingMode?: boolean;
}

const selectClassName =
  "flex h-9 w-full min-w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function TodosPageHeader({
  organizationId,
  canCreate,
  teams,
  members,
  defaultOwnerId,
  filters,
  onFiltersChange,
  meetingMode = false,
}: TodosPageHeaderProps) {
  const createAction =
    canCreate ? (
      <CreateTodoDialog
        organizationId={organizationId}
        teams={teams}
        members={members}
        defaultOwnerId={defaultOwnerId}
      />
    ) : null;

  return (
    <div className={meetingMode ? "space-y-3" : "space-y-6"}>
      {meetingMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Review 7-day action items.</p>
          {createAction}
        </div>
      ) : (
        <PageHeader
          title="Todos"
          description="7-day accountable actions — due this week or overdue stay visible until done."
          actions={createAction}
        />
      )}

      <div
        className="flex flex-wrap items-end gap-3"
        data-testid="todos-filters"
      >
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">View</span>
          <div className="flex rounded-md border border-input p-0.5">
            <button
              type="button"
              data-testid="todos-seven-day-toggle"
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.sevenDayOnly
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() =>
                onFiltersChange({ ...filters, sevenDayOnly: true })
              }
            >
              7-day
            </button>
            <button
              type="button"
              data-testid="todos-all-toggle"
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                !filters.sevenDayOnly
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() =>
                onFiltersChange({ ...filters, sevenDayOnly: false })
              }
            >
              All
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="todos-filter-owner"
            className="text-xs font-medium text-muted-foreground"
          >
            Owner
          </label>
          <select
            id="todos-filter-owner"
            className={selectClassName}
            value={filters.ownerId ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                ownerId: event.target.value || undefined,
              })
            }
          >
            <option value="">All owners</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="todos-filter-status"
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id="todos-filter-status"
            className={selectClassName}
            value={filters.status ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: (event.target.value || undefined) as TodoFilters["status"],
              })
            }
            disabled={filters.sevenDayOnly}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="todos-filter-team"
            className="text-xs font-medium text-muted-foreground"
          >
            Team
          </label>
          <select
            id="todos-filter-team"
            className={selectClassName}
            value={filters.teamId ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                teamId: event.target.value || undefined,
              })
            }
          >
            <option value="">All teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
