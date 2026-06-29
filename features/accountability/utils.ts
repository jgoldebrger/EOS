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
