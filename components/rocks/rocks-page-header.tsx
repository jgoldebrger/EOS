"use client";

import { PageHeader } from "@/components/shared/page-header";
import { CreateRockDialog } from "@/components/rocks/create-rock-dialog";
import { formatQuarterLabel } from "@/features/rocks/utils";
import type {
  RockFilters,
  RockMemberOption,
  RockTeamOption,
} from "@/features/rocks/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "on_track", label: "On track" },
  { value: "off_track", label: "Off track" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
] as const;

interface RocksPageHeaderProps {
  organizationId: string;
  canCreate: boolean;
  teams: RockTeamOption[];
  members: RockMemberOption[];
  defaultOwnerId: string;
  defaultQuarter: string;
  quarters: string[];
  filters: RockFilters;
  onFiltersChange: (filters: RockFilters) => void;
}

const selectClassName =
  "flex h-9 w-full min-w-[140px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function RocksPageHeader({
  organizationId,
  canCreate,
  teams,
  members,
  defaultOwnerId,
  defaultQuarter,
  quarters,
  filters,
  onFiltersChange,
}: RocksPageHeaderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Rocks"
        description="Quarterly priorities with status, confidence, and progress tracking."
        actions={
          canCreate ? (
            <CreateRockDialog
              organizationId={organizationId}
              teams={teams}
              members={members}
              defaultOwnerId={defaultOwnerId}
              defaultQuarter={defaultQuarter}
            />
          ) : undefined
        }
      />

      <div
        className="flex flex-wrap items-end gap-3"
        data-testid="rocks-filters"
      >
        <div className="space-y-1">
          <label htmlFor="rocks-filter-quarter" className="text-xs font-medium text-muted-foreground">
            Quarter
          </label>
          <select
            id="rocks-filter-quarter"
            className={selectClassName}
            value={filters.quarter ?? ""}
            onChange={(event) =>
              onFiltersChange({ ...filters, quarter: event.target.value || undefined })
            }
          >
            <option value="">All quarters</option>
            {quarters.map((quarter) => (
              <option key={quarter} value={quarter}>
                {formatQuarterLabel(quarter)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="rocks-filter-owner" className="text-xs font-medium text-muted-foreground">
            Owner
          </label>
          <select
            id="rocks-filter-owner"
            className={selectClassName}
            value={filters.ownerId ?? ""}
            onChange={(event) =>
              onFiltersChange({ ...filters, ownerId: event.target.value || undefined })
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
          <label htmlFor="rocks-filter-status" className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            id="rocks-filter-status"
            className={selectClassName}
            value={filters.status ?? ""}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: (event.target.value || undefined) as RockFilters["status"],
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
          <label htmlFor="rocks-filter-team" className="text-xs font-medium text-muted-foreground">
            Team
          </label>
          <select
            id="rocks-filter-team"
            className={selectClassName}
            value={filters.teamId ?? ""}
            onChange={(event) =>
              onFiltersChange({ ...filters, teamId: event.target.value || undefined })
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
