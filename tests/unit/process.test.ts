import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  archiveProcessPageSchema,
  createProcessPageSchema,
  deleteProcessPageSchema,
  sopDocumentSchema,
  updateProcessPageSchema,
} from "@/features/process/schema";
import {
  DEFAULT_PROCESS_CATEGORY,
  filterProcessPages,
  flattenProcessPageTree,
  getProcessCategories,
} from "@/features/process/list-utils";
import { totalSopMinutes } from "@/features/process/export";
import type { ProcessPageListItem } from "@/features/process/types";

function makePage(
  overrides: Partial<ProcessPageListItem> & Pick<ProcessPageListItem, "id" | "title">,
): ProcessPageListItem {
  return {
    content: "",
    content_format: "sop",
    parent_id: null,
    team_id: null,
    category: DEFAULT_PROCESS_CATEGORY,
    archived_at: null,
    accountability_seat_id: null,
    tags: [],
    updated_at: "2026-06-30T12:00:00.000Z",
    created_at: "2026-06-30T12:00:00.000Z",
    ...overrides,
  };
}

describe("process schemas", () => {
  const orgId = "a1111111-1111-4111-8111-111111111111";
  const pageId = "b2222222-2222-4222-8222-222222222222";
  const teamId = "c3333333-3333-4333-8333-333333333333";

  it("validates create process page for org scope", () => {
    const parsed = createProcessPageSchema.parse({
      organizationId: orgId,
      orgSlug: "acme",
      title: "Onboarding SOP",
    });

    expect(parsed.teamId).toBeUndefined();
    expect(parsed.title).toBe("Onboarding SOP");
  });

  it("validates create process page for team scope", () => {
    const parsed = createProcessPageSchema.parse({
      organizationId: orgId,
      orgSlug: "acme",
      teamId,
      teamSlug: "leadership",
      title: "Weekly review",
    });

    expect(parsed.teamId).toBe(teamId);
    expect(parsed.teamSlug).toBe("leadership");
  });

  it("validates sop document shape", () => {
    const parsed = sopDocumentSchema.parse({
      id: pageId,
      title: "Ship by 2 PM",
      department: "Operations",
      priority: "High",
      steps: [
        {
          title: "Check queue",
          time: "5",
          note: "Review open tickets",
          dependencies: [],
          imageUrl: "",
          approver: "",
          approvalStatus: "pending",
        },
      ],
      lastModified: "2026-06-30T12:00:00.000Z",
    });

    expect(parsed.steps).toHaveLength(1);
    expect(parsed.title).toBe("Ship by 2 PM");
  });

  it("validates update with markdown and sop document", () => {
    const parsed = updateProcessPageSchema.parse({
      id: pageId,
      organizationId: orgId,
      orgSlug: "acme",
      teamId: null,
      contentMarkdown: "# Title\n\nStep one",
      sopDocument: {
        id: pageId,
        title: "Title",
        department: "General",
        priority: "Medium",
        steps: [],
      },
    });

    expect(parsed.contentMarkdown).toContain("# Title");
    expect(parsed.sopDocument?.title).toBe("Title");
  });

  it("validates delete process page", () => {
    const parsed = deleteProcessPageSchema.parse({
      id: pageId,
      organizationId: orgId,
      orgSlug: "acme",
      teamId,
      teamSlug: "ops",
    });

    expect(parsed.teamSlug).toBe("ops");
  });

  it("validates archive process page", () => {
    const parsed = archiveProcessPageSchema.parse({
      id: pageId,
      organizationId: orgId,
      orgSlug: "acme",
      teamId,
      teamSlug: "ops",
      archived: true,
    });

    expect(parsed.id).toBe(pageId);
    expect(parsed.archived).toBe(true);
  });

  it("rejects empty sop title", () => {
    const result = sopDocumentSchema.safeParse({
      id: pageId,
      title: "",
      department: "General",
      priority: "Medium",
      steps: [],
    });

    expect(result.success).toBe(false);
  });

  it("ships embedded SOP-Designer with embed bridge", () => {
    const html = readFileSync(
      join(process.cwd(), "public", "sop-designer", "index.html"),
      "utf8",
    );

    expect(html).toContain("EMBED_MODE");
    expect(html).toContain("sop-designer:save");
    expect(html).toContain("sop-designer:load");
  });
});

describe("process list utils", () => {
  const parent = makePage({ id: "parent", title: "Parent SOP", category: "General" });
  const child = makePage({
    id: "child",
    title: "Child SOP",
    parent_id: "parent",
    category: "General",
  });
  const ops = makePage({ id: "ops", title: "Ops checklist", category: "Operations" });
  const archived = makePage({
    id: "archived",
    title: "Old SOP",
    archived_at: "2026-01-01T00:00:00.000Z",
  });

  it("filters by title and category", () => {
    const filtered = filterProcessPages([parent, child, ops, archived], {
      search: "ops",
      category: "Operations",
    });

    expect(filtered.map((page) => page.id)).toEqual(["ops"]);
  });

  it("includes parent pages when a child matches", () => {
    const filtered = filterProcessPages([parent, child, ops], {
      search: "child",
      category: "all",
    });

    expect(filtered.map((page) => page.id)).toEqual(["parent", "child"]);
  });

  it("hides archived pages unless requested", () => {
    const hidden = filterProcessPages([archived], { category: "all" });
    const shown = filterProcessPages([archived], {
      category: "all",
      showArchived: true,
    });

    expect(hidden).toHaveLength(0);
    expect(shown).toHaveLength(1);
  });

  it("flattens pages into a hierarchy", () => {
    const nodes = flattenProcessPageTree([child, parent, ops]);

    expect(nodes.map((node) => [node.page.id, node.depth])).toEqual([
      ["ops", 0],
      ["parent", 0],
      ["child", 1],
    ]);
  });

  it("collects unique categories with a General default", () => {
    expect(getProcessCategories([ops])).toEqual(["General", "Operations"]);
  });
});

describe("process export helpers", () => {
  it("sums step minutes for total time", () => {
    const total = totalSopMinutes({
      id: "b2222222-2222-4222-8222-222222222222",
      title: "Test",
      department: "General",
      priority: "Medium",
      steps: [
        {
          title: "A",
          time: "5",
          note: "",
          dependencies: [],
          imageUrl: "",
          approver: "",
          approvalStatus: "pending",
        },
        {
          title: "B",
          time: "10",
          note: "",
          dependencies: [],
          imageUrl: "",
          approver: "",
          approvalStatus: "pending",
        },
      ],
    });

    expect(total).toBe(15);
  });
});
