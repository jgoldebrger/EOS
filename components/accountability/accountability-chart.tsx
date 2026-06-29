"use client";

import type { SeatNode } from "@/features/accountability/types";
import { SeatCard } from "@/components/accountability/seat-card";
import { cn } from "@/lib/utils";

interface AccountabilityChartProps {
  tree: SeatNode[];
  canManage: boolean;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
}

function SeatBranch({
  node,
  canManage,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
  depth,
}: {
  node: SeatNode;
  canManage: boolean;
  onEditSeat?: (seat: SeatNode) => void;
  onDeleteSeat?: (seat: SeatNode) => void;
  onAssignSeat?: (seat: SeatNode) => void;
  depth: number;
}) {
  return (
    <li className="flex flex-col items-center">
      <SeatCard
        seat={node}
        canManage={canManage}
        onEdit={onEditSeat}
        onDelete={onDeleteSeat}
        onAssign={onAssignSeat}
        className={cn(depth === 0 && "mx-auto w-full max-w-md")}
      />
      {node.children.length > 0 && (
        <ul className="relative mt-4 flex list-none flex-wrap justify-center gap-4 p-0 before:absolute before:left-1/2 before:top-0 before:h-4 before:w-px before:-translate-x-1/2 before:bg-border">
          {node.children.map((child) => (
            <li
              key={child.id}
              className="relative pt-4 before:absolute before:left-1/2 before:top-0 before:h-4 before:w-px before:-translate-x-1/2 before:bg-border"
            >
              <SeatBranch
                node={child}
                canManage={canManage}
                onEditSeat={onEditSeat}
                onDeleteSeat={onDeleteSeat}
                onAssignSeat={onAssignSeat}
                depth={depth + 1}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function AccountabilityChart({
  tree,
  canManage,
  onEditSeat,
  onDeleteSeat,
  onAssignSeat,
}: AccountabilityChartProps) {
  return (
    <div data-testid="accountability-chart" className="overflow-x-auto pb-4">
      <ul className="m-0 flex list-none flex-wrap justify-center gap-8 p-0">
        {tree.map((node) => (
          <SeatBranch
            key={node.id}
            node={node}
            canManage={canManage}
            onEditSeat={onEditSeat}
            onDeleteSeat={onDeleteSeat}
            onAssignSeat={onAssignSeat}
            depth={0}
          />
        ))}
      </ul>
    </div>
  );
}
