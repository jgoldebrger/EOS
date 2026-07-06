"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin } from "lucide-react";
import { reorderIssues, setIssueParkingLot } from "@/features/issues/actions";
import type { IssueWithLinks } from "@/features/issues/types";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { showErrorToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/types/domain";

interface IssueMeetingListProps {
  organizationId: string;
  orgSlug: string;
  orgRole: OrgRole;
  activeIssues: IssueWithLinks[];
  parkingLotIssues: IssueWithLinks[];
  pinnedIssueIds: string[];
  onTogglePin: (issueId: string) => void;
}

function SortableIssueRow({
  issue,
  canEdit,
  isPinned,
  onTogglePin,
  onOpen,
}: {
  issue: IssueWithLinks;
  canEdit: boolean;
  isPinned: boolean;
  onTogglePin: (issueId: string) => void;
  onOpen: (issue: IssueWithLinks) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: issue.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-3 py-2",
        isDragging && "opacity-50",
      )}
      data-testid="issue-meeting-row"
    >
      {canEdit ? (
        <button
          type="button"
          className="touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums"
        data-testid="issue-priority-rank"
      >
        {issue.priorityRank}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={isPinned ? "Unpin issue" : "Pin to top 3"}
        onClick={() => onTogglePin(issue.id)}
      >
        <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current text-primary")} />
      </Button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpen(issue)}
        data-testid="issue-row-title"
      >
        <p className="truncate font-medium">{issue.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {issue.owner.userId ? (
            <span className="inline-flex items-center gap-1">
              <OwnerAvatar name={issue.owner.label} size="sm" />
              {issue.owner.label}
            </span>
          ) : (
            <span>Unassigned</span>
          )}
          <StatusBadge status={issue.status} />
        </div>
      </button>
    </div>
  );
}

export function IssueMeetingList({
  organizationId,
  orgSlug,
  orgRole,
  activeIssues,
  parkingLotIssues,
  pinnedIssueIds,
  onTogglePin,
}: IssueMeetingListProps) {
  const [selectedIssue, setSelectedIssue] = useState<IssueWithLinks | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    activeIssues.map((issue) => issue.id),
  );
  const [, startTransition] = useTransition();

  const activeIdSet = useMemo(
    () => new Set(activeIssues.map((issue) => issue.id)),
    [activeIssues],
  );

  const canEdit = orgRole !== "viewer";

  const issueById = useMemo(
    () => new Map(activeIssues.map((issue) => [issue.id, issue])),
    [activeIssues],
  );

  const orderedIssues = useMemo(() => {
    const fromOrder = orderedIds
      .filter((id) => activeIdSet.has(id))
      .map((id) => issueById.get(id))
      .filter((issue): issue is IssueWithLinks => Boolean(issue));
    const missing = activeIssues.filter((issue) => !orderedIds.includes(issue.id));
    return [...fromOrder, ...missing].map((issue, index) => ({
      ...issue,
      priorityRank: index + 1,
    }));
  }, [activeIdSet, activeIssues, issueById, orderedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const openIssue = useCallback((issue: IssueWithLinks) => {
    setSelectedIssue(issue);
    setSheetOpen(true);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !canEdit) return;

      const oldIndex = orderedIds.indexOf(String(active.id));
      const newIndex = orderedIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const nextIds = arrayMove(orderedIds, oldIndex, newIndex);
      setOrderedIds(nextIds);

      startTransition(async () => {
        const result = await reorderIssues({
          organizationId,
          issueIds: nextIds,
        });
        if (!result.success) {
          showErrorToast("Could not reorder issues", result.error);
          setOrderedIds(activeIssues.map((issue) => issue.id));
        }
      });
    },
    [activeIssues, canEdit, orderedIds, organizationId],
  );

  function moveToParkingLot(issueId: string) {
    startTransition(async () => {
      const result = await setIssueParkingLot({
        organizationId,
        issueId,
        isParkingLot: true,
      });
      if (!result.success) {
        showErrorToast("Could not move to parking lot", result.error);
      }
    });
  }

  function restoreFromParkingLot(issueId: string) {
    startTransition(async () => {
      const result = await setIssueParkingLot({
        organizationId,
        issueId,
        isParkingLot: false,
      });
      if (!result.success) {
        showErrorToast("Could not restore issue", result.error);
      }
    });
  }

  return (
    <>
      <div className="space-y-6" data-testid="issues-meeting-list">
        {orderedIssues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active issues for IDS.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <SortableIssueRow
                        issue={issue}
                        canEdit={canEdit}
                        isPinned={pinnedIssueIds.includes(issue.id)}
                        onTogglePin={onTogglePin}
                        onOpen={openIssue}
                      />
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => moveToParkingLot(issue.id)}
                        data-testid="issue-park-button"
                      >
                        Park
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="space-y-2" data-testid="issues-parking-lot">
          <h3 className="text-sm font-medium text-muted-foreground">Parking lot</h3>
          {parkingLotIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Deferred issues appear here until you restore them to IDS.
            </p>
          ) : (
            parkingLotIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openIssue(issue)}
                >
                  <p className="truncate font-medium">{issue.title}</p>
                </button>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => restoreFromParkingLot(issue.id)}
                    data-testid="issue-restore-button"
                  >
                    Restore
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <IssueDetailSheet
        issue={selectedIssue}
        orgSlug={orgSlug}
        canEdit={canEdit}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        meetingMode
      />
    </>
  );
}
