import { describe, expect, it } from "vitest";
import {
  createSnapshotSchema,
  restoreSnapshotSchema,
  toggleSectionVisibilitySchema,
  updateSectionSchema,
} from "@/features/vto/schema";
import {
  buildSnapshotPayload,
  DEFAULT_VTO_SECTIONS,
  formatSnapshotDate,
  sortVtoSections,
} from "@/features/vto/utils";
import type { VtoSection } from "@/features/vto/types";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const sectionId = "550e8400-e29b-41d4-a716-446655440003";
const snapshotId = "550e8400-e29b-41d4-a716-446655440004";

function makeSection(
  overrides: Partial<VtoSection> & Pick<VtoSection, "id" | "section_key" | "title">,
): VtoSection {
  return {
    organization_id: orgId,
    content: "",
    display_order: 0,
    visible: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by: null,
    ...overrides,
  };
}

describe("DEFAULT_VTO_SECTIONS", () => {
  it("defines six EOS V/TO sections in order", () => {
    expect(DEFAULT_VTO_SECTIONS).toHaveLength(6);
    expect(DEFAULT_VTO_SECTIONS.map((section) => section.section_key)).toEqual([
      "core_values",
      "core_focus",
      "ten_year_target",
      "marketing_strategy",
      "three_year_picture",
      "one_year_plan",
    ]);
  });
});

describe("buildSnapshotPayload", () => {
  it("serializes section fields for snapshot storage", () => {
    const sections = [
      makeSection({
        id: "a",
        section_key: "core_values",
        title: "Core Values",
        content: "Integrity",
        display_order: 0,
      }),
    ];

    const payload = buildSnapshotPayload(sections);

    expect(payload).toEqual([
      {
        section_key: "core_values",
        title: "Core Values",
        content: "Integrity",
        display_order: 0,
        visible: true,
      },
    ]);
  });
});

describe("sortVtoSections", () => {
  it("orders by display_order then title", () => {
    const sections = [
      makeSection({
        id: "b",
        section_key: "b",
        title: "Beta",
        display_order: 2,
      }),
      makeSection({
        id: "a",
        section_key: "a",
        title: "Alpha",
        display_order: 1,
      }),
    ];

    const sorted = sortVtoSections(sections);

    expect(sorted.map((section) => section.id)).toEqual(["a", "b"]);
  });
});

describe("formatSnapshotDate", () => {
  it("returns a non-empty formatted string", () => {
    const formatted = formatSnapshotDate("2026-06-29T12:00:00.000Z");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("updateSectionSchema", () => {
  it("requires at least one field to update", () => {
    const result = updateSectionSchema.safeParse({
      organizationId: orgId,
      sectionId,
    });

    expect(result.success).toBe(false);
  });

  it("accepts content updates", () => {
    const result = updateSectionSchema.safeParse({
      organizationId: orgId,
      sectionId,
      content: "Our north star",
    });

    expect(result.success).toBe(true);
  });
});

describe("toggleSectionVisibilitySchema", () => {
  it("requires visible boolean", () => {
    const result = toggleSectionVisibilitySchema.safeParse({
      organizationId: orgId,
      sectionId,
    });

    expect(result.success).toBe(false);
  });
});

describe("createSnapshotSchema", () => {
  it("accepts organization id", () => {
    const result = createSnapshotSchema.safeParse({ organizationId: orgId });
    expect(result.success).toBe(true);
  });
});

describe("restoreSnapshotSchema", () => {
  it("requires snapshot id", () => {
    const result = restoreSnapshotSchema.safeParse({
      organizationId: orgId,
      snapshotId,
    });

    expect(result.success).toBe(true);
  });
});
