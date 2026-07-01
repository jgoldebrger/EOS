"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveWorkItemState } from "@/features/projects/actions";
import type { WorkItemWithMeta } from "@/features/projects/types";
import { KANBAN_COLUMNS, formatWorkItemState } from "@/features/projects/utils";
import type { ProjectWorkItemStateDb } from "@/types/database";
import { showErrorToast } from "@/components/feedback/toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectBoardProps {
  items: WorkItemWithMeta[];
  organizationId: string;
  projectId: string;
  orgSlug: string;
  projectSlug: string;
  canEdit: boolean;
  onSelect: (item: WorkItemWithMeta) => void;
}

function SortableCard({
  item,
  onSelect,
}: {
  item: WorkItemWithMeta;
  onSelect: (item: WorkItemWithMeta) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { state: item.state } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("touch-none", isDragging && "opacity-50")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className="w-full rounded-md border bg-card p-3 text-left text-sm shadow-xs hover:bg-muted/50"
        onClick={() => onSelect(item)}
      >
        <p className="font-mono text-[10px] text-muted-foreground">
          {item.identifier}
        </p>
        <p className="font-medium leading-snug">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{item.assignee.label}</p>
      </button>
    </div>
  );
}

function Column({
  state,
  children,
}: {
  state: ProjectWorkItemStateDb;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: state });
  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[120px] space-y-2", isOver && "rounded-md bg-muted/40")}
    >
      {children}
    </div>
  );
}

export function ProjectBoard({
  items,
  organizationId,
  projectId,
  orgSlug,
  projectSlug,
  canEdit,
  onSelect,
}: ProjectBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columns = useMemo(() => {
    const map = new Map<ProjectWorkItemStateDb, WorkItemWithMeta[]>();
    for (const col of KANBAN_COLUMNS) {
      map.set(col, []);
    }
    for (const item of items) {
      if (KANBAN_COLUMNS.includes(item.state as ProjectWorkItemStateDb)) {
        map.get(item.state as ProjectWorkItemStateDb)?.push(item);
      }
    }
    return map;
  }, [items]);

  const activeItem = activeId
    ? items.find((i) => i.id === activeId) ?? null
    : null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!canEdit) return;

    const { active, over } = event;
    if (!over) return;

    const item = items.find((i) => i.id === active.id);
    if (!item) return;

    const overState = KANBAN_COLUMNS.includes(over.id as ProjectWorkItemStateDb)
      ? (over.id as ProjectWorkItemStateDb)
      : (items.find((i) => i.id === over.id)?.state ?? item.state);

    if (overState === item.state) return;

    startTransition(async () => {
      const result = await moveWorkItemState({
        organizationId,
        projectId,
        workItemId: item.id,
        orgSlug,
        projectSlug,
        state: overState,
      });
      if (!result.success) {
        showErrorToast("Could not move item", result.error);
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((state) => {
          const colItems = columns.get(state) ?? [];
          return (
            <Card key={state} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="capitalize">{formatWorkItemState(state)}</span>
                  <Badge variant="secondary">{colItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <SortableContext
                  items={colItems.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Column state={state}>
                    {colItems.map((item) => (
                      <SortableCard key={item.id} item={item} onSelect={onSelect} />
                    ))}
                  </Column>
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="rounded-md border bg-card p-3 text-sm shadow-lg">
            <p className="font-medium">{activeItem.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
