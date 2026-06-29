"use client";

import { OwnerAvatar } from "@/components/shared/owner-avatar";
import type { SeatNode } from "@/features/accountability/types";
import { cn } from "@/lib/utils";

interface SeatCardProps {
  seat: SeatNode;
  canManage: boolean;
  onEdit?: (seat: SeatNode) => void;
  onDelete?: (seat: SeatNode) => void;
  onAssign?: (seat: SeatNode) => void;
  className?: string;
}

export function SeatCard({
  seat,
  canManage,
  onEdit,
  onDelete,
  onAssign,
  className,
}: SeatCardProps) {
  const assigneeName = seat.assignee?.label ?? "Unassigned";

  return (
    <article
      data-testid={`seat-card-${seat.id}`}
      className={cn(
        "rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="truncate text-base font-semibold leading-tight">
            {seat.title}
          </h3>
          <div className="flex items-center gap-2">
            <OwnerAvatar
              name={assigneeName}
              size="sm"
              className={!seat.assignee ? "opacity-50" : undefined}
            />
            <span className="truncate text-sm text-muted-foreground">
              {assigneeName}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 flex-wrap gap-1">
            {onAssign && (
              <button
                type="button"
                data-testid={`assign-seat-${seat.id}`}
                onClick={() => onAssign(seat)}
                className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
              >
                Assign
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                data-testid={`edit-seat-${seat.id}`}
                onClick={() => onEdit(seat)}
                className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
              >
                Edit
              </button>
            )}
            {onDelete && seat.children.length === 0 && (
              <button
                type="button"
                data-testid={`delete-seat-${seat.id}`}
                onClick={() => onDelete(seat)}
                className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-muted"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {seat.responsibilities && (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
          {seat.responsibilities}
        </p>
      )}
    </article>
  );
}
