import type { SeatNode, SeatWithAssignee } from "@/features/accountability/types";

export function buildTree(flat: SeatWithAssignee[]): SeatNode[] {
  const map = new Map<string, SeatNode>();

  for (const seat of flat) {
    map.set(seat.id, { ...seat, children: [] });
  }

  const roots: SeatNode[] = [];

  for (const seat of flat) {
    const node = map.get(seat.id)!;
    if (seat.parent_id && map.has(seat.parent_id)) {
      map.get(seat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortSeatNodes(roots);
  return roots;
}

export function sortSeatNodes(nodes: SeatNode[]): void {
  nodes.sort(
    (a, b) =>
      a.display_order - b.display_order ||
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
  for (const node of nodes) {
    sortSeatNodes(node.children);
  }
}

export function flattenTree(tree: SeatNode[]): SeatWithAssignee[] {
  const result: SeatWithAssignee[] = [];

  function walk(nodes: SeatNode[]) {
    for (const node of nodes) {
      const { children, ...seat } = node;
      result.push(seat);
      walk(children);
    }
  }

  walk(tree);
  return result;
}

export function getChildSeatAssigneeUserIds(
  seats: Array<{
    id: string;
    parent_id: string | null;
    assigned_user_id: string | null;
  }>,
  userId: string,
): Set<string> {
  const childrenByParent = new Map<string, Array<(typeof seats)[number]>>();
  for (const seat of seats) {
    if (!seat.parent_id) {
      continue;
    }
    const siblings = childrenByParent.get(seat.parent_id) ?? [];
    siblings.push(seat);
    childrenByParent.set(seat.parent_id, siblings);
  }

  const userSeats = seats.filter((seat) => seat.assigned_user_id === userId);
  const assigneeIds = new Set<string>();

  function collectDescendantAssignees(parentId: string) {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (child.assigned_user_id) {
        assigneeIds.add(child.assigned_user_id);
      }
      collectDescendantAssignees(child.id);
    }
  }

  for (const seat of userSeats) {
    collectDescendantAssignees(seat.id);
  }

  return assigneeIds;
}

/** Assignee user ids on seats that are direct children of seats assigned to `userId`. */
export function getDirectReportAssigneeUserIds(
  seats: Array<{
    id: string;
    parent_id: string | null;
    assigned_user_id: string | null;
  }>,
  userId: string,
): Set<string> {
  const userSeatIds = new Set(
    seats.filter((seat) => seat.assigned_user_id === userId).map((seat) => seat.id),
  );
  const assigneeIds = new Set<string>();

  for (const seat of seats) {
    if (seat.parent_id && userSeatIds.has(seat.parent_id) && seat.assigned_user_id) {
      assigneeIds.add(seat.assigned_user_id);
    }
  }

  return assigneeIds;
}
