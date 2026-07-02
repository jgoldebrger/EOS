"use client";

import { PageHeader } from "@/components/shared/page-header";
import { CreateIssueDialog } from "@/components/issues/create-issue-dialog";
import type {
  IssueFilters,
  IssueMemberOption,
  IssueTeamOption,
} from "@/features/issues/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "discussing", label: "Discussing" },
  { value: "solved", label: "Solved" },
  { value: "archived", label: "Archived" },
] as const;

interface IssuesPageHeaderProps {
  organizationId: string;
  canCreate: boolean;
  teams: IssueTeamOption[];
  members: IssueMemberOption[];
  defaultOwnerId: string;
  defaultTeamId?: string;
  linkedMeetingId?: string;
  filters: IssueFilters;
  onFiltersChange: (filters: IssueFilters) => void;
  meetingMode?: boolean;
}

const selectClassName =
  "flex h-9 w-full min-w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function IssuesPageHeader({
  organizationId,
  canCreate,
  teams,
  members,
  defaultOwnerId,
  defaultTeamId,
  linkedMeetingId,
  filters,
  onFiltersChange,
  meetingMode = false,
}: IssuesPageHeaderProps) {
  const createAction =
    canCreate ? (
      <CreateIssueDialog
        organizationId={organizationId}
        teams={teams}
        members={members}
        defaultOwnerId={defaultOwnerId}
        defaultTeamId={defaultTeamId}
        linkedMeetingId={linkedMeetingId}
      />
    ) : null;

  return (
    <div className={meetingMode ? "space-y-3" : "space-y-6"}>
      {meetingMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Identify, discuss, and solve issues.
          </p>
          {createAction}
        </div>
      ) : (
        <PageHeader
          title="Issues"
          description="Prioritized IDS list — Identify, Discuss, and Solve what is blocking progress."
          actions={createAction}
        />
      )}

      <div
        className="flex flex-wrap items-end gap-3"
        data-testid="issues-filters"
      >
        <div className="space-y-1">
          <label
            htmlFor="issues-filter-status"
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id="issues-filter-status"
            className={selectClassName}
            value={filters.status ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: (event.target.value || undefined) as IssueFilters["status"],
              })
            }
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
            htmlFor="issues-filter-owner"
            className="text-xs font-medium text-muted-foreground"
          >
            Owner
          </label>
          <select
            id="issues-filter-owner"
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

        {!meetingMode ? (
          <div className="space-y-1">
            <label
              htmlFor="issues-filter-team"
              className="text-xs font-medium text-muted-foreground"
            >
              Team
            </label>
            <select
              id="issues-filter-team"
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
        ) : null}

        <div className="flex items-center gap-2 pb-1">
          <input
            id="issues-filter-archived"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.includeArchived ?? false}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                includeArchived: event.target.checked,
              })
            }
          />
          <label
            htmlFor="issues-filter-archived"
            className="text-sm text-muted-foreground"
          >
            Show archived
          </label>
        </div>
      </div>
    </div>
  );
}
