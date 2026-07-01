import { describe, expect, it } from "vitest";
import { createLoadSchema } from "@/features/transport/schema";
import {
  formatLoadLabel,
  formatLoadStatus,
  groupLoadsByStatus,
} from "@/features/transport/utils";
import { nearestNeighborOrder } from "@/features/transport/vroom-client";

describe("transport utils", () => {
  it("formats load label", () => {
    expect(formatLoadLabel(42)).toBe("LD-42");
  });

  it("formats load status", () => {
    expect(formatLoadStatus("in_transit")).toBe("in transit");
  });

  it("groups loads by dispatch column", () => {
    const groups = groupLoadsByStatus([
      { status: "quote" as const, id: "1" },
      { status: "dispatched" as const, id: "2" },
      { status: "quote" as const, id: "3" },
    ]);
    expect(groups.get("quote")).toHaveLength(2);
    expect(groups.get("dispatched")).toHaveLength(1);
  });
});

describe("createLoadSchema", () => {
  it("accepts valid load input", () => {
    const result = createLoadSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      orgSlug: "acme",
      customerName: "Acme Retail",
      stops: [{ address: "123 Main St" }],
    });
    expect(result.success).toBe(true);
  });
});

describe("nearestNeighborOrder", () => {
  it("orders stops from depot", () => {
    const depot: [number, number] = [0, 0];
    const stops = [
      { id: "far", location: [10, 10] as [number, number] },
      { id: "near", location: [1, 0] as [number, number] },
    ];
    const ordered = nearestNeighborOrder(depot, stops);
    expect(ordered[0]).toBe("near");
    expect(ordered[1]).toBe("far");
  });
});
