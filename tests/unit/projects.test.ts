import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  createWorkItemSchema,
} from "@/features/projects/schema";
import {
  filterWorkItems,
  formatWorkItemIdentifier as formatId,
  isOpenWorkItemState,
} from "@/features/projects/utils";

describe("createProjectSchema", () => {
  it("accepts valid project input", () => {
    const result = createProjectSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      orgSlug: "acme",
      title: "Q3 Launch",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createProjectSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      orgSlug: "acme",
      title: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createWorkItemSchema", () => {
  it("accepts valid work item input", () => {
    const result = createWorkItemSchema.safeParse({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      projectId: "550e8400-e29b-41d4-a716-446655440001",
      orgSlug: "acme",
      projectSlug: "q3-launch",
      title: "Design homepage",
    });
    expect(result.success).toBe(true);
  });
});

describe("project utils", () => {
  it("formats work item identifier", () => {
    expect(formatId("PROJ", 12)).toBe("PROJ-12");
  });

  it("filters work items by search", () => {
    const items = [
      {
        title: "Alpha task",
        state: "backlog",
        priority: "none",
        assignee_id: null,
        module_id: null,
        cycle_id: null,
      },
      {
        title: "Beta task",
        state: "started",
        priority: "high",
        assignee_id: null,
        module_id: null,
        cycle_id: null,
      },
    ];
    expect(filterWorkItems(items, { search: "alpha" })).toHaveLength(1);
  });

  it("detects open work item states", () => {
    expect(isOpenWorkItemState("started")).toBe(true);
    expect(isOpenWorkItemState("completed")).toBe(false);
  });
});
