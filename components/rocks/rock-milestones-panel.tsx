"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  completeRockMilestone,
  createRockMilestone,
  deleteRockMilestone,
} from "@/features/rocks/milestone-actions";
import type { RockMilestone } from "@/features/rocks/types";
import { showErrorToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RockMilestonesPanelProps {
  organizationId: string;
  rockId: string;
  milestones: RockMilestone[];
  canEdit: boolean;
  compact?: boolean;
}

export function RockMilestonesPanel({
  organizationId,
  rockId,
  milestones: initialMilestones,
  canEdit,
  compact = false,
}: RockMilestonesPanelProps) {
  const [milestones, setMilestones] = useState(initialMilestones);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleToggle(milestone: RockMilestone) {
    if (!canEdit) return;

    const completed = !milestone.completed_at;
    startTransition(async () => {
      const result = await completeRockMilestone({
        organizationId,
        rockId,
        milestoneId: milestone.id,
        completed,
      });

      if (!result.success) {
        showErrorToast("Could not update milestone", result.error);
        return;
      }

      setMilestones((current) =>
        current.map((row) =>
          row.id === milestone.id
            ? { ...row, completed_at: completed ? new Date().toISOString() : null }
            : row,
        ),
      );
    });
  }

  function handleAdd() {
    if (!newTitle.trim() || !canEdit) return;

    startTransition(async () => {
      const result = await createRockMilestone({
        organizationId,
        rockId,
        title: newTitle.trim(),
        dueDate: newDueDate || null,
        sortOrder: milestones.length,
      });

      if (!result.success) {
        showErrorToast("Could not add milestone", result.error);
        return;
      }

      setMilestones((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          organization_id: organizationId,
          rock_id: rockId,
          title: newTitle.trim(),
          due_date: newDueDate || null,
          completed_at: null,
          sort_order: current.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setNewTitle("");
      setNewDueDate("");
    });
  }

  function handleDelete(milestoneId: string) {
    if (!canEdit) return;

    startTransition(async () => {
      const result = await deleteRockMilestone({
        organizationId,
        rockId,
        milestoneId,
      });

      if (!result.success) {
        showErrorToast("Could not delete milestone", result.error);
        return;
      }

      setMilestones((current) => current.filter((row) => row.id !== milestoneId));
    });
  }

  return (
    <div
      className={cn("space-y-2", compact ? "pt-1" : "rounded-md border bg-muted/20 p-3")}
      data-testid="rock-milestones-panel"
    >
      {!compact ? (
        <p className="text-xs font-medium text-muted-foreground">Milestones</p>
      ) : null}

      <ul className="space-y-1.5">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="flex items-start gap-2 text-sm">
            <button
              type="button"
              disabled={!canEdit || isPending}
              onClick={() => handleToggle(milestone)}
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                milestone.completed_at
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-input bg-background",
                !canEdit && "cursor-default opacity-60",
              )}
              aria-label={milestone.completed_at ? "Mark incomplete" : "Mark complete"}
            >
              {milestone.completed_at ? <Check className="h-3 w-3" /> : null}
            </button>
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  milestone.completed_at && "text-muted-foreground line-through",
                )}
              >
                {milestone.title}
              </span>
              {milestone.due_date ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {new Date(`${milestone.due_date}T00:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : null}
            </div>
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={isPending}
                onClick={() => handleDelete(milestone.id)}
                aria-label="Delete milestone"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="New milestone"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 max-w-xs text-sm"
            disabled={isPending}
          />
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="h-8 w-36 text-sm"
            disabled={isPending}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending || !newTitle.trim()}
            onClick={handleAdd}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      ) : milestones.length === 0 ? (
        <p className="text-xs text-muted-foreground">No milestones yet.</p>
      ) : null}
    </div>
  );
}
