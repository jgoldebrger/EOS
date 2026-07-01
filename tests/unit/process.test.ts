import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createProcessPageSchema,
  deleteProcessPageSchema,
  sopDocumentSchema,
  updateProcessPageSchema,
} from "@/features/process/schema";

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
