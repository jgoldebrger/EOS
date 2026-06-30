import { describe, expect, it } from "vitest";
import {
  assignUserSchema,
  createSeatSchema,
  reorderSeatsSchema,
  updateSeatSchema,
} from "@/features/accountability/schema";
import {
  buildTree,
  flattenTree,
  getDirectReportAssigneeUserIds,
  sortSeatNodes,
} from "@/features/accountability/utils";
import type { SeatWithAssignee } from "@/features/accountability/types";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const userId = "550e8400-e29b-41d4-a716-446655440002";

function makeSeat(
  overrides: Partial<SeatWithAssignee> & Pick<SeatWithAssignee, "id" | "title">,
): SeatWithAssignee {
  return {
    organization_id: orgId,
    parent_id: null,
    responsibilities: null,
    assigned_user_id: null,
    display_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: userId,
    assignee: null,
    ...overrides,
  };
}

describe("buildTree", () => {
  it("nests seats under their parent", () => {
    const flat = [
      makeSeat({ id: "a", title: "Visionary", display_order: 0 }),
      makeSeat({
        id: "b",
        title: "Integrator",
        parent_id: "a",
        display_order: 0,
      }),
      makeSeat({
        id: "c",
        title: "Sales",
        parent_id: "b",
        display_order: 1,
      }),
    ];

    const tree = buildTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("a");
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.id).toBe("b");
    expect(tree[0]!.children[0]!.children[0]!.id).toBe("c");
  });

  it("sorts siblings by display_order then title", () => {
    const flat = [
      makeSeat({ id: "a", title: "Root", display_order: 0 }),
      makeSeat({
        id: "b",
        title: "Beta",
        parent_id: "a",
        display_order: 2,
      }),
      makeSeat({
        id: "c",
        title: "Alpha",
        parent_id: "a",
        display_order: 1,
      }),
    ];

    const tree = buildTree(flat);
    const childIds = tree[0]!.children.map((node) => node.id);

    expect(childIds).toEqual(["c", "b"]);
  });

  it("promotes orphans to root when parent is missing", () => {
    const flat = [
      makeSeat({ id: "a", title: "Orphan", parent_id: "missing" }),
    ];

    const tree = buildTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("a");
  });
});

describe("flattenTree", () => {
  it("returns depth-first flat list without children", () => {
    const flat = [
      makeSeat({ id: "a", title: "Root" }),
      makeSeat({ id: "b", title: "Child", parent_id: "a" }),
    ];
    const tree = buildTree(flat);
    const result = flattenTree(tree);

    expect(result).toHaveLength(2);
    expect(result.map((seat) => seat.id)).toEqual(["a", "b"]);
    expect(result[0]).not.toHaveProperty("children");
  });
});

describe("sortSeatNodes", () => {
  it("orders nodes in place", () => {
    const nodes = [
      {
        ...makeSeat({ id: "b", title: "B", display_order: 1 }),
        children: [],
      },
      {
        ...makeSeat({ id: "a", title: "A", display_order: 0 }),
        children: [],
      },
    ];

    sortSeatNodes(nodes);

    expect(nodes.map((node) => node.id)).toEqual(["a", "b"]);
  });
});

describe("createSeatSchema", () => {
  it("requires a title", () => {
    const result = createSeatSchema.safeParse({
      organizationId: orgId,
      title: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid seat input", () => {
    const result = createSeatSchema.safeParse({
      organizationId: orgId,
      title: "Integrator",
      parentId: null,
      responsibilities: "Run the business",
    });

    expect(result.success).toBe(true);
  });
});

describe("updateSeatSchema", () => {
  it("requires at least one field to update", () => {
    const result = updateSeatSchema.safeParse({
      organizationId: orgId,
      seatId: "550e8400-e29b-41d4-a716-446655440003",
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial updates", () => {
    const result = updateSeatSchema.safeParse({
      organizationId: orgId,
      seatId: "550e8400-e29b-41d4-a716-446655440003",
      title: "Updated title",
    });

    expect(result.success).toBe(true);
  });
});

describe("assignUserSchema", () => {
  it("allows clearing assignment with null userId", () => {
    const result = assignUserSchema.safeParse({
      organizationId: orgId,
      seatId: "550e8400-e29b-41d4-a716-446655440003",
      userId: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("reorderSeatsSchema", () => {
  it("requires at least one order entry", () => {
    const result = reorderSeatsSchema.safeParse({
      organizationId: orgId,
      orders: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("getDirectReportAssigneeUserIds", () => {
  const managerId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const directReportId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const grandchildId = "cccccccc-cccc-cccc-cccc-cccccccccccc";

  it("returns only depth-1 assignees under the user seats", () => {
    const seats = [
      { id: "seat-1", parent_id: null, assigned_user_id: managerId },
      { id: "seat-2", parent_id: "seat-1", assigned_user_id: directReportId },
      { id: "seat-3", parent_id: "seat-2", assigned_user_id: grandchildId },
    ];

    const directReports = getDirectReportAssigneeUserIds(seats, managerId);
    expect(directReports.has(directReportId)).toBe(true);
    expect(directReports.has(grandchildId)).toBe(false);
  });
});
