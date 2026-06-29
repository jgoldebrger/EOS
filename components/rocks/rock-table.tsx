"use client";

import { useCallback, useMemo, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { updateRockStatus } from "@/features/rocks/actions";
import { formatQuarterLabel } from "@/features/rocks/utils";
import type { RockWithOwner } from "@/features/rocks/types";
import { DataTable } from "@/components/data-table/data-table";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { RockAtRiskIndicator } from "@/components/rocks/rock-at-risk-indicator";
import { RockProgress } from "@/components/rocks/rock-progress";
import { showErrorToast } from "@/components/feedback/toast";
import { canManageOrg } from "@/lib/permissions/checks";
import type { OrgRole } from "@/types/domain";

interface RockTableProps {
  organizationId: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  rocks: RockWithOwner[];
  canCreate: boolean;
}

const STATUS_OPTIONS = [
  { value: "on_track", label: "On track" },
  { value: "off_track", label: "Off track" },
  { value: "done", label: "Done" },
  { value: "dropped", label: "Dropped" },
] as const;

function canEditRock(
  rock: RockWithOwner,
  orgRole: OrgRole,
  currentUserId: string,
  isTeamLeader: boolean,
): boolean {
  if (orgRole === "viewer") {
    return false;
  }

  return (
    rock.owner_id === currentUserId ||
    canManageOrg(orgRole) ||
    (isTeamLeader && rock.team_id !== null)
  );
}

export function RockTable({
  organizationId,
  orgRole,
  currentUserId,
  isTeamLeader,
  rocks,
  canCreate,
}: RockTableProps) {
  const [, startTransition] = useTransition();

  const handleStatusChange = useCallback(
    (rock: RockWithOwner, status: string) => {
      startTransition(async () => {
        const result = await updateRockStatus({
          organizationId,
          rockId: rock.id,
          status: status as RockWithOwner["status"],
        });

        if (!result.success) {
          showErrorToast("Could not update status", result.error);
        }
      });
    },
    [organizationId],
  );

  const columns = useMemo<ColumnDef<RockWithOwner>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Rock",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.title}</p>
            {row.original.success_definition && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.success_definition}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <OwnerAvatar name={row.original.owner.label} size="sm" />
            <span className="text-sm">{row.original.owner.label}</span>
          </div>
        ),
      },
      {
        accessorKey: "quarter",
        header: "Quarter",
        cell: ({ row }) => (
          <span className="text-sm">{formatQuarterLabel(row.original.quarter)}</span>
        ),
      },
      {
        accessorKey: "teamName",
        header: "Team",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.teamName ?? "Organization"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const editable = canEditRock(
            row.original,
            orgRole,
            currentUserId,
            isTeamLeader,
          );

          if (!editable) {
            return <StatusBadge status={row.original.status} />;
          }

          return (
            <select
              className="flex h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={row.original.status}
              onChange={(event) => handleStatusChange(row.original, event.target.value)}
              data-testid="rock-status-select"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }) => <RockProgress value={row.original.progress} />,
      },
      {
        id: "risk",
        header: "Risk",
        cell: ({ row }) => <RockAtRiskIndicator rock={row.original} />,
        enableSorting: false,
      },
      {
        accessorKey: "due_date",
        header: "Due",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.due_date
              ? new Date(`${row.original.due_date}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : "—"}
          </span>
        ),
      },
    ],
    [orgRole, currentUserId, isTeamLeader, handleStatusChange],
  );

  return (
    <div data-testid="rocks-table">
      <DataTable
        columns={columns}
        data={rocks}
        emptyTitle="No rocks yet"
        emptyDescription="Add quarterly priorities to track progress across your organization."
        emptyAction={
          canCreate ? (
            <p className="text-sm text-muted-foreground">
              Use the Add rock button above to get started.
            </p>
          ) : undefined
        }
        pageSize={15}
      />
    </div>
  );
}
