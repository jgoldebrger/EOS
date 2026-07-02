"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronRight, Pin } from "lucide-react";
import { updatePriority } from "@/features/issues/actions";
import type { IssueWithLinks } from "@/features/issues/types";
import { DataTable } from "@/components/data-table/data-table";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { showErrorToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import type { OrgRole } from "@/types/domain";

interface IssueTableProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  issues: IssueWithLinks[];
  canCreate: boolean;
  meetingMode?: boolean;
  pinnedIssueIds?: string[];
  onTogglePin?: (issueId: string) => void;
}

export function IssueTable({
  organizationId,
  orgSlug,
  orgRole,
  issues,
  canCreate,
  meetingMode = false,
  pinnedIssueIds = [],
  onTogglePin,
}: IssueTableProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueWithLinks | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

  const canEdit = orgRole !== "viewer";

  const openIssue = useCallback((issue: IssueWithLinks) => {
    setSelectedIssue(issue);
    setSheetOpen(true);
  }, []);

  const handlePriorityChange = useCallback(
    (issue: IssueWithLinks, delta: number) => {
      const newPriority = Math.max(0, issue.priority + delta);

      startTransition(async () => {
        const result = await updatePriority({
          organizationId,
          issueId: issue.id,
          priority: newPriority,
        });

        if (!result.success) {
          showErrorToast("Could not update priority", result.error);
        }
      });
    },
    [organizationId],
  );

  const columns = useMemo<ColumnDef<IssueWithLinks>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
              data-testid="issue-priority-rank"
            >
              {row.original.priorityRank}
            </span>
            {meetingMode && onTogglePin ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={
                  pinnedIssueIds.includes(row.original.id)
                    ? "Unpin issue"
                    : "Pin to top 3"
                }
                onClick={() => onTogglePin(row.original.id)}
              >
                <Pin
                  className={`h-3.5 w-3.5 ${
                    pinnedIssueIds.includes(row.original.id) ? "fill-current text-primary" : ""
                  }`}
                />
              </Button>
            ) : null}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: "Issue",
        cell: ({ row }) => (
          <button
            type="button"
            className="group flex w-full items-start gap-2 text-left"
            onClick={() => openIssue(row.original)}
            data-testid="issue-row-title"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium group-hover:text-primary">{row.original.title}</p>
              {row.original.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {row.original.description}
                </p>
              )}
              {(row.original.linkedMetricName || row.original.linkedRockTitle) && (
                <p className="text-xs text-muted-foreground">
                  {row.original.linkedMetricName && `Metric: ${row.original.linkedMetricName}`}
                  {row.original.linkedMetricName && row.original.linkedRockTitle && " · "}
                  {row.original.linkedRockTitle && `Rock: ${row.original.linkedRockTitle}`}
                </p>
              )}
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: ({ row }) =>
          row.original.owner.userId ? (
            <div className="flex items-center gap-2">
              <OwnerAvatar name={row.original.owner.label} size="sm" />
              <span className="text-sm">{row.original.owner.label}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
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
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => {
          if (!canEdit || row.original.status === "archived") {
            return (
              <span className="text-sm tabular-nums text-muted-foreground">
                {row.original.priority}
              </span>
            );
          }

          return (
            <div
              className="flex items-center gap-1"
              data-testid="issue-priority-controls"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Increase priority"
                onClick={() => handlePriorityChange(row.original, 1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-sm tabular-nums">
                {row.original.priority}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                aria-label="Decrease priority"
                onClick={() => handlePriorityChange(row.original, -1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [canEdit, handlePriorityChange, meetingMode, onTogglePin, openIssue, pinnedIssueIds],
  );

  return (
    <>
      <div data-testid="issues-table">
        <DataTable
          columns={columns}
          data={issues}
          emptyTitle="No issues yet"
          emptyDescription="Capture blockers and friction points to work through IDS as a team."
          emptyAction={
            canCreate ? (
              <p className="text-sm text-muted-foreground">
                Use Add issue above for fast capture, then prioritize and solve.
              </p>
            ) : undefined
          }
          pageSize={20}
        />
      </div>

      <IssueDetailSheet
        issue={selectedIssue}
        orgSlug={orgSlug}
        canEdit={canEdit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        meetingMode={meetingMode}
      />
    </>
  );
}
