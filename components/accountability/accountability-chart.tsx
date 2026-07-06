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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { reorderSeats } from "@/features/accountability/actions";
import type { SeatNode } from "@/features/accountability/types";
import { SeatCard } from "@/components/accountability/seat-card";
import { showErrorToast } from "@/components/feedback/toast";
import { cn } from "@/lib/utils";

interface AccountabilityChartProps {
  organizationId: string;
  tree: SeatNode[];
  canManage: boolean;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
}

function SortableSeatCard({
  node,
  canManage,
  depth,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
}: {
  node: SeatNode;
  canManage: boolean;
  depth: number;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("flex flex-col items-center", isDragging && "opacity-50")}
    >
      <div className="flex items-start gap-1">
        {canManage ? (
          <button
            type="button"
            className="mt-3 touch-none text-muted-foreground hover:text-foreground"
            aria-label="Drag to reorder seat"
            data-testid="seat-drag-handle"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <SeatCard
          seat={node}
          canManage={canManage}
          onEdit={onEditSeat}
          onDelete={onDeleteSeat}
          onAssign={onAssignSeat}
          className={cn(depth === 0 && "w-full max-w-md")}
        />
      </div>
    </div>
  );
}

function SeatBranch({
  node,
  organizationId,
  canManage,
  depth,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
}: {
  node: SeatNode;
  organizationId: string;
  canManage: boolean;
  depth: number;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
}) {
  return (
    <li className="flex flex-col items-center">
      <SortableSeatCard
        node={node}
        canManage={canManage}
        depth={depth}
        onEditSeat={onEditSeat}
        onDeleteSeat={onDeleteSeat}
        onAssignSeat={onAssignSeat}
      />
      {node.children.length > 0 ? (
        <SiblingList
          nodes={node.children}
          organizationId={organizationId}
          canManage={canManage}
          depth={depth + 1}
          onEditSeat={onEditSeat}
          onDeleteSeat={onDeleteSeat}
          onAssignSeat={onAssignSeat}
          nested
        />
      ) : null}
    </li>
  );
}

function SiblingList({
  nodes,
  organizationId,
  canManage,
  depth,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
  nested = false,
}: {
  nodes: SeatNode[];
  organizationId: string;
  canManage: boolean;
  depth: number;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
  nested?: boolean;
}) {
  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.display_order - b.display_order),
    [nodes],
  );
  const [orderedIds, setOrderedIds] = useState(() => sortedNodes.map((node) => node.id));
  const [, startTransition] = useTransition();

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const orderedNodes = useMemo(
    () =>
      orderedIds
        .map((id) => nodeById.get(id))
        .filter((node): node is SeatNode => Boolean(node)),
    [nodeById, orderedIds],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !canManage) return;

      const oldIndex = orderedIds.indexOf(String(active.id));
      const newIndex = orderedIds.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;

      const nextIds = arrayMove(orderedIds, oldIndex, newIndex);
      setOrderedIds(nextIds);

      startTransition(async () => {
        const result = await reorderSeats({
          organizationId,
          orders: nextIds.map((seatId, index) => ({
            seatId,
            displayOrder: index * 10,
          })),
        });

        if (!result.success) {
          showErrorToast("Could not reorder seats", result.error);
          setOrderedIds(sortedNodes.map((node) => node.id));
        }
      });
    },
    [canManage, orderedIds, organizationId, sortedNodes],
  );

  const list = (
    <ul
      className={cn(
        "m-0 flex list-none flex-wrap justify-center gap-8 p-0",
        nested &&
          "relative mt-4 gap-4 before:absolute before:left-1/2 before:top-0 before:h-4 before:w-px before:-translate-x-1/2 before:bg-border",
      )}
    >
      {orderedNodes.map((node) => (
        <SeatBranch
          key={node.id}
          node={node}
          organizationId={organizationId}
          canManage={canManage}
          depth={depth}
          onEditSeat={onEditSeat}
          onDeleteSeat={onDeleteSeat}
          onAssignSeat={onAssignSeat}
        />
      ))}
    </ul>
  );

  if (!canManage || orderedNodes.length < 2) {
    return list;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={orderedIds} strategy={horizontalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}

export function AccountabilityChart({
  organizationId,
  tree,
  canManage,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
}: AccountabilityChartProps) {
  return (
    <div data-testid="accountability-chart" className="overflow-x-auto pb-4">
      <SiblingList
        nodes={tree}
        organizationId={organizationId}
        canManage={canManage}
        depth={0}
        onEditSeat={onEditSeat}
        onDeleteSeat={onDeleteSeat}
        onAssignSeat={onAssignSeat}
      />
    </div>
  );
}
